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

    const fallbackProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email ?? '',
      full_name: currentUser.user_metadata?.full_name ?? currentUser.email ?? '',
      avatar_url: currentUser.user_metadata?.avatar_url ?? null,
      phone: currentUser.user_metadata?.phone ?? null,
      country: currentUser.user_metadata?.country ?? null,
      role: currentUser.user_metadata?.role ?? (currentUser.email === 'admin@admin.com' ? 'admin' : 'student'),
      approval_status: currentUser.user_metadata?.approval_status ?? 'approved',
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (epoch !== authEpochRef.current) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle<UserProfile>();

      if (epoch !== authEpochRef.current) {
        return;
      }

      if (!error && data) {
        setProfile(data);
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
          setProfile({
            id: session.user.id,
            email: session.user.email ?? '',
            full_name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
            avatar_url: session.user.user_metadata?.avatar_url ?? null,
            phone: session.user.user_metadata?.phone ?? null,
            country: session.user.user_metadata?.country ?? null,
            role: session.user.user_metadata?.role ?? (session.user.email === 'admin@admin.com' ? 'admin' : 'student'),
            approval_status: session.user.user_metadata?.approval_status ?? 'approved',
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
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
        setProfile((prev) => prev?.id === nextUser.id ? prev : {
          id: nextUser.id,
          email: nextUser.email ?? '',
          full_name: nextUser.user_metadata?.full_name ?? nextUser.email ?? '',
          avatar_url: nextUser.user_metadata?.avatar_url ?? null,
          phone: nextUser.user_metadata?.phone ?? null,
          country: nextUser.user_metadata?.country ?? null,
          role: nextUser.user_metadata?.role ?? (nextUser.email === 'admin@admin.com' ? 'admin' : 'student'),
          approval_status: nextUser.user_metadata?.approval_status ?? 'approved',
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setLoading(false);

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          country: country || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error };
    }

    // Upsert phone and country into the profiles table if provided and user exists
    if (data.user && (phone || country)) {
      const updates: Record<string, string> = {};
      if (phone) updates.phone = phone;
      if (country) updates.country = country;

      await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', data.user.id);
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

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      return { error: error as Error };
    }

    // Also sync user_metadata in Supabase Auth
    const metaUpdates: Record<string, unknown> = {};
    if (updates.full_name !== undefined) metaUpdates.full_name = updates.full_name;
    if (updates.phone !== undefined) metaUpdates.phone = updates.phone;
    if (updates.country !== undefined) metaUpdates.country = updates.country;

    if (Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metaUpdates }).catch((err) => {
        console.warn('AuthContext - Metadata sync notice:', err);
      });
    }

    await refreshProfile(user, authEpochRef.current);
    return { error: null };
  }, [user, refreshProfile]);

  const isEnrolled = useCallback((courseId: string): boolean => enrollments.some((enrollment) => enrollment.course_id === courseId), [enrollments]);

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

