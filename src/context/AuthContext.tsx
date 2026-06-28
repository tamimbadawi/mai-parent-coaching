import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

  const refreshProfile = async (currentUser: User | null): Promise<void> => {
    console.log('AuthContext - refreshProfile called with user:', !!currentUser);
    if (!currentUser) {
      setProfile(null);
      return;
    }

    console.log('AuthContext - Fetching profile for user ID:', currentUser.id);
    
    // Use user metadata as immediate fallback to prevent hanging
    const fallbackProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email ?? '',
      full_name: currentUser.user_metadata?.full_name ?? currentUser.email ?? '',
      avatar_url: currentUser.user_metadata?.avatar_url ?? null,
      phone: null,
      country: null,
      role: currentUser.user_metadata?.role ?? (currentUser.email === 'admin@admin.com' ? 'admin' : 'student'),
      approval_status: currentUser.user_metadata?.approval_status ?? 'approved',
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Set fallback profile immediately, then try to fetch real profile
    setProfile(fallbackProfile);
    console.log('AuthContext - Fallback profile set, loading should be false now');
    setLoading(false);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle<UserProfile>();

      console.log('AuthContext - Profile data:', data, 'error:', error);
      if (!error && data) {
        console.log('AuthContext - Updating with real profile');
        setProfile(data);
      } else if (error) {
        console.error('AuthContext - Profile fetch error, keeping fallback:', error);
      }
    } catch (err) {
      console.error('AuthContext - Profile fetch exception, keeping fallback:', err);
    }
  };

  const refreshEnrollments = async (currentUser: User | null): Promise<void> => {
    if (!currentUser) {
      setEnrollments([]);
      return;
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('enrolled_at', { ascending: false });

    if (error) {
      setEnrollments([]);
      return;
    }

    setEnrollments(data ?? []);
  };

  useEffect((): (() => void) => {
    let isMounted = true;

    const initializeSession = async (): Promise<void> => {
      console.log('AuthContext - initializeSession starting...');
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      console.log('AuthContext - Session:', !!session, 'error:', error);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('AuthContext - Session error:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('AuthContext - User found, setting user and loading profile');
        setUser(session.user);
        await refreshProfile(session.user);
        await refreshEnrollments(session.user);
      } else {
        console.log('AuthContext - No session, clearing auth state');
        setUser(null);
        setProfile(null);
        setEnrollments([]);
      }

      console.log('AuthContext - Setting loading to false');
      setLoading(false);
    };

    void initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      console.log('AuthContext - Auth state changed:', _event, 'has session:', !!nextSession);
      if (!isMounted) {
        return;
      }

      if (nextSession?.user) {
        setUser(nextSession.user);
        await refreshProfile(nextSession.user);
        await refreshEnrollments(nextSession.user);
      } else {
        setUser(null);
        setProfile(null);
        setEnrollments([]);
      }

      console.log('AuthContext - Auth state change complete, setting loading to false');
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string, country?: string): Promise<{ error: Error | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error };
    }

    // Upsert phone and country into the profiles table if provided
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
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error ?? null };
  };

  const signInWithMagicLink = async (email: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error ?? null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setEnrollments([]);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
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

    await refreshProfile(user);
    return { error: null };
  };

  const isEnrolled = (courseId: string): boolean => enrollments.some((enrollment) => enrollment.course_id === courseId);

  const refreshEnrollmentsHandler = async (): Promise<void> => {
    await refreshEnrollments(user);
  };

  const value: AuthContextValue = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
