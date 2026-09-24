import { supabase } from '../../../lib/supabase';
import type { HouseholdMemberRole } from '../../../types/family';

function deriveBirthYear(childAge: string | null | undefined): number | null {
  if (!childAge) return null;
  const num = parseInt(childAge, 10);
  if (Number.isNaN(num)) return null;
  return new Date().getFullYear() - num;
}

/**
 * Ensures that a client has an associated household.
 *
 * 1. If the client already has a household, returns its ID.
 * 2. Otherwise creates a household named "<full_name or email> Family" with
 *    primary_contact_profile_id = clientId and status = 'active'.
 * 3. Adds a parent member using the client's name with role 'parent'.
 * 4. Adds each distinct child_name found in the client's bookings as a 'child' member,
 *    with birth_year derived from child_age.
 * 5. Returns the new household ID.
 */
export async function ensureHousehold(clientId: string): Promise<string | null> {
  if (!clientId) return null;

  try {
    // 1. Check if the client already has a household
    const { data: existingHousehold, error: fetchErr } = await supabase
      .from('households')
      .select('id')
      .eq('primary_contact_profile_id', clientId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Error checking existing household for client:', fetchErr);
    }

    if (existingHousehold?.id) {
      return existingHousehold.id;
    }

    // 2. Fetch profile info for the client
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', clientId)
      .maybeSingle();

    // 3. Fetch bookings for this client
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, parent_name, email, child_name, child_age, appointment_date')
      .eq('user_id', clientId)
      .order('appointment_date', { ascending: false });

    const clientDisplayName =
      profile?.full_name?.trim() ||
      profile?.email?.trim() ||
      bookings?.[0]?.parent_name?.trim() ||
      bookings?.[0]?.email?.trim() ||
      'Client';

    const familyName = `${clientDisplayName} Family`.trim();

    // 4. Create the household
    const { data: newHousehold, error: hErr } = await supabase
      .from('households')
      .insert({
        family_name: familyName,
        primary_contact_profile_id: clientId,
        status: 'active',
      })
      .select('id')
      .single();

    if (hErr) {
      console.error('Failed to create household:', hErr);
      // Double check in case created concurrently
      const { data: retryHousehold } = await supabase
        .from('households')
        .select('id')
        .eq('primary_contact_profile_id', clientId)
        .maybeSingle();
      if (retryHousehold?.id) return retryHousehold.id;
      return null;
    }

    // 5. Add parent member with role 'parent'
    const parentName =
      profile?.full_name?.trim() ||
      bookings?.[0]?.parent_name?.trim() ||
      profile?.email?.trim() ||
      'Parent';

    const { error: pErr } = await supabase
      .from('household_members')
      .insert({
        household_id: newHousehold.id,
        full_name: parentName,
        role: 'parent' as HouseholdMemberRole,
      });

    if (pErr) {
      console.error('Failed to create parent household member:', pErr);
    }

    // 6. Add distinct children from bookings as 'child' members
    const distinctChildren = new Map<string, string | null>();
    (bookings ?? []).forEach((b) => {
      const trimmed = b.child_name?.trim();
      if (trimmed && !distinctChildren.has(trimmed)) {
        distinctChildren.set(trimmed, b.child_age || null);
      }
    });

    if (distinctChildren.size > 0) {
      const childMembers = Array.from(distinctChildren.entries()).map(([childName, childAge]) => ({
        household_id: newHousehold.id,
        full_name: childName,
        role: 'child' as HouseholdMemberRole,
        birth_year: deriveBirthYear(childAge),
      }));

      const { error: cErr } = await supabase
        .from('household_members')
        .insert(childMembers);

      if (cErr) {
        console.error('Failed to create child household members:', cErr);
      }
    }

    return newHousehold.id;
  } catch (err) {
    console.error('ensureHousehold failed unexpectedly:', err);
    return null;
  }
}
