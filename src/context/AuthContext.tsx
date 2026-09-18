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
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('AuthContext - Session error:', error);
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

      if (isMounted) {
        setLoading(false);
      }
    };

    void initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      const epoch = bumpAuthEpoch();

      if (nextSession?.user) {
        setUser(nextSession.user);
        await refreshProfile(nextSession.user, epoch);
        await refreshEnrollments(nextSession.user, epoch);
      } else {
        setUser(null);
        setProfile(null);
        setEnrollments([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
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
    setUser(null);
    setProfile(null);
    setEnrollments([]);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('AuthContext - Sign out error, trying local scope:', error);
      await supabase.auth.signOut({ scope: 'local' });
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

