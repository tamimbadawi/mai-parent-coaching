import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { CourseEnrollment, UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  enrollments: CourseEnrollment[];
  signUp: (email: string, password: string, fullName: string, phone?: string, country?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isEnrolled: (courseId: string) => boolean;
  refreshEnrollments: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const authEpochRef = useRef(0);

  const bumpAuthEpoch = (): number => {
    authEpochRef.current += 1;
    return authEpochRef.current;
  };

  const refreshProfile = useCallback(async (currentUser: User | null, epoch: number): Promise<void> => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const inferredRole: UserProfile['role'] =
      currentUser.user_metadata?.role === 'admin' ||
      currentUser.app_metadata?.role === 'admin' ||
      currentUser.email?.toLowerCase() === 'tamimbadawi@gmail.com'
        ? 'admin'
        : currentUser.user_metadata?.role === 'assistant' ||
          currentUser.app_metadata?.role === 'assistant'
        ? 'assistant'
        : 'student';

    const fallbackProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email ?? '',
      full_name: currentUser.user_metadata?.full_name ?? currentUser.email ?? '',
      avatar_url: currentUser.user_metadata?.avatar_url ?? null,
      phone: currentUser.user_metadata?.phone ?? null,
      country: currentUser.user_metadata?.country ?? null,
      city: currentUser.user_metadata?.city ?? null,
      address: currentUser.user_metadata?.address ?? null,
      role: inferredRole,
      approval_status: currentUser.user_metadata?.approval_status ?? 'approved',
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (epoch !== authEpochRef.current) {
      return;
    }

    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle<UserProfile>();

      // If no data returned and no explicit error, wait 200ms and retry once (session token propagation)
      if (!error && !data) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (epoch === authEpochRef.current) {
          const retryRes = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle<UserProfile>();
          if (retryRes.data) {
            data = retryRes.data;
          }
          if (retryRes.error) {
            error = retryRes.error;
          }
        }
      }

      if (epoch !== authEpochRef.current) {
        return;
      }

      if (!error && data) {
        setProfile(data);
        // Sync user_metadata if different so local cached session retains full info
        const meta = currentUser.user_metadata || {};
        const metaCleanPhone = (meta.phone ? String(meta.phone).replace(/\D/g, '') : '');
        const metaHasPhone = Boolean(meta.phone && metaCleanPhone.length >= 7);
        const metaHasCountry = Boolean(meta.country);

        // Auto-heal profiles table if metadata contains phone/country that profiles table is currently missing
        if ((!data.phone && metaHasPhone) || (!data.country && metaHasCountry)) {
          const profileSelfHeal: Record<string, string> = {};
          if (!data.phone && metaHasPhone) profileSelfHeal.phone = String(meta.phone);
          if (!data.country && metaHasCountry) profileSelfHeal.country = String(meta.country);

          void supabase
            .from('profiles')
            .update({ ...profileSelfHeal, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id)
            .then(
              () => {
                setProfile((prev) => (prev ? { ...prev, ...profileSelfHeal } : prev));
              },
              () => {}
            );
        }

        if (
          (data.phone && meta.phone !== data.phone) ||
          (data.country && meta.country !== data.country) ||
          (data.city && meta.city !== data.city) ||
          (data.address && meta.address !== data.address)
        ) {
          void supabase.auth.updateUser({
            data: {
              phone: data.phone,
              country: data.country,
              city: data.city,
              address: data.address,
            },
          }).catch(() => {});
        }
      } else {
        if (error) {
          console.error('AuthContext - Profile fetch error, using fallback:', error);
        }
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.error('AuthContext - Profile fetch exception, using fallback:', err);
      setProfile(fallbackProfile);
    }
  }, []);

  const refreshEnrollments = useCallback(async (currentUser: User | null, epoch: number): Promise<void> => {
    if (!currentUser) {
      setEnrollments([]);
      return;
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('enrolled_at', { ascending: false });

    if (epoch !== authEpochRef.current) {
      return;
    }

    if (error) {
      setEnrollments([]);
      return;
    }

    setEnrollments(data ?? []);
  }, []);

  useEffect((): (() => void) => {
    let isMounted = true;

    const initializeSession = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session;

        if (!isMounted) return;

        if (error) {
          console.error('AuthContext - Session error:', error);
          setUser(null);
          setProfile(null);
          setEnrollments([]);
          setLoading(false);
          return;
        }

        const epoch = authEpochRef.current;

        if (session?.user) {
          setUser(session.user);
          await refreshProfile(session.user, epoch);
          await refreshEnrollments(session.user, epoch);
        } else {
          setUser(null);
          setProfile(null);
          setEnrollments([]);
        }
      } catch (err) {
        console.error('AuthContext - Init error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      const epoch = bumpAuthEpoch();

      if (nextSession?.user) {
        const nextUser = nextSession.user;
        setUser(nextUser);
        // Only keep previous profile if it belongs to the same user
        setProfile((prev) => (prev?.id === nextUser.id ? prev : null));
        setLoading(true);

        // Supabase warns against awaiting client calls inside onAuthStateChange:
        // the auth callback holds an internal lock that those calls may also need.
        // Defer dependent reads until the callback has returned and released it.
        window.setTimeout(() => {
          if (!isMounted || epoch !== authEpochRef.current) return;
          void Promise.all([
            refreshProfile(nextUser, epoch),
            refreshEnrollments(nextUser, epoch),
          ]).catch((err: unknown) => {
            console.error('AuthContext - deferred auth refresh error:', err);
          }).finally(() => {
            if (isMounted && epoch === authEpochRef.current) {
              setLoading(false);
            }
          });
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
        setEnrollments([]);
        setLoading(false);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [refreshProfile, refreshEnrollments]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone?: string, country?: string): Promise<{ error: Error | null }> => {
    const cleanDigits = (phone || '').replace(/\D/g, '');
    if (!phone?.trim() || cleanDigits.length < 7) {
      return { error: new Error('A valid working phone number (minimum 7 digits) is required.') };
    }
    if (!country?.trim()) {
      return { error: new Error('Country of residence is required.') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          country: country.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error };
    }

    // Upsert phone and country into the profiles table if provided and user exists
    if (data.user && (phone || country)) {
      const updates: Record<string, string> = {
        phone: phone.trim(),
        country: country.trim(),
        updated_at: new Date().toISOString(),
      };

      try {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', data.user.id);
      } catch {
        // ignore
      }
    }

    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error ?? null };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    bumpAuthEpoch();

    // 0. Delete caller's family_unlocks rows before signing out (ignoring errors)
    try {
      const currentUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (currentUserId) {
        await supabase.from('family_unlocks').delete().eq('admin_id', currentUserId);
      }
    } catch {
      // ignore
    }

    // 1. Wipe all localStorage items matching supabase or auth FIRST
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }

    // 2. Wipe all sessionStorage items
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // ignore
    }

    // 3. Clear auth cookies
    try {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth') || name.includes('token')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
      });
    } catch {
      // ignore
    }

    // 4. Update React state
    setUser(null);
    setProfile(null);
    setEnrollments([]);

    // 5. Notify Supabase client locally then globally
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // ignore
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('You need to be signed in to update your profile.') };
    }

    const cleanDigits = (updates.phone || '').replace(/\D/g, '');
    const hasPhoneAndCountry = Boolean(updates.phone && cleanDigits.length >= 7 && updates.country);

    if (hasPhoneAndCountry) {
      // Use the security-definer complete_user_profile RPC to ensure profile creation and admin notification
      const { error: rpcError } = await supabase.rpc('complete_user_profile', {
        p_phone: updates.phone!.trim(),
        p_country: updates.country!.trim(),
        p_full_name: updates.full_name || user.user_metadata?.full_name || profile?.full_name || user.email || '',
      });

      if (rpcError) {
        console.warn('AuthContext - complete_user_profile RPC notice, falling back to direct upsert:', rpcError.message);
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email ?? '',
            full_name: updates.full_name || user.user_metadata?.full_name || profile?.full_name || user.email || '',
            ...updates,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) {
          return { error: upsertError as Error };
        }
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        return { error: error as Error };
      }
    }

    // Also sync user_metadata in Supabase Auth
    const metaUpdates: Record<string, unknown> = {};
    if (updates.full_name !== undefined) metaUpdates.full_name = updates.full_name;
    if (updates.phone !== undefined) metaUpdates.phone = updates.phone;
    if (updates.country !== undefined) metaUpdates.country = updates.country;
    if (updates.city !== undefined) metaUpdates.city = updates.city;
    if (updates.address !== undefined) metaUpdates.address = updates.address;

    if (Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metaUpdates }).catch((err) => {
        console.warn('AuthContext - Metadata sync notice:', err);
      });
    }

    await refreshProfile(user, authEpochRef.current);
    return { error: null };
  }, [user, refreshProfile]);

  const isEnrolled = useCallback((courseId: string): boolean => enrollments.some((enrollment) => enrollment.course_id === courseId && enrollment.status === 'active'), [enrollments]);

  const refreshEnrollmentsHandler = useCallback(async (): Promise<void> => {
    await refreshEnrollments(user, authEpochRef.current);
  }, [user, refreshEnrollments]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      enrollments,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      updateProfile,
      isEnrolled,
      refreshEnrollments: refreshEnrollmentsHandler,
    }),
    [
      user,
      profile,
      loading,
      enrollments,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithMagicLink,
      signOut,
      updateProfile,
      isEnrolled,
      refreshEnrollmentsHandler,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

