import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';

/**
 * Redirects retired Family Case routes to Session Notes.
 * /admin/families -> /admin/sessions?client=<primary_contact_profile_id> (or /admin/sessions)
 * /admin/families/:householdId -> /admin/sessions?client=<primary_contact_profile_id> (or /admin/sessions)
 */
export const FamilyRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { householdId } = useParams<{ householdId?: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const clientParam = searchParams.get('client');
    if (clientParam) {
      navigate(`/admin/sessions?client=${clientParam}`, { replace: true });
      return;
    }

    if (householdId) {
      void (async () => {
        try {
          const { data } = await supabase
            .from('households')
            .select('primary_contact_profile_id')
            .eq('id', householdId)
            .maybeSingle();

          if (data?.primary_contact_profile_id) {
            navigate(`/admin/sessions?client=${data.primary_contact_profile_id}`, { replace: true });
          } else {
            navigate('/admin/sessions', { replace: true });
          }
        } catch {
          navigate('/admin/sessions', { replace: true });
        }
      })();
      return;
    }

    navigate('/admin/sessions', { replace: true });
  }, [householdId, searchParams, navigate]);

  return (
    <AdminLayout title="Family Case" subtitle="Redirecting to Session Notes...">
      <div className="flex flex-col items-center justify-center py-20 text-warm-gray">
        <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
        <p className="text-sm font-medium">Opening unified Session Notes workspace...</p>
      </div>
    </AdminLayout>
  );
};

export default FamilyRedirect;
