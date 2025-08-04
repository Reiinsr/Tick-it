import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, isAdmin?: boolean) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  isAdmin: (userProfile: any) => boolean;
  isSuperAdmin: (userProfile: any) => boolean;
  isCategoryAdmin: (userProfile: any, category: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user profile
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // Try to create a profile if it doesn't exist
        if (error.code === 'PGRST116') { // No rows returned
          await createUserProfile(userId);
          return;
        }
        return;
      }

      if (data) {
        setUserProfile(data);
        
        // Only update admin role if user is first user and no admin exists
        if (data.role !== 'admin') {
          const { data: adminCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);
          
          if (!adminCheck || adminCheck.length === 0) {
            // Make first user admin
            await supabase
              .from('profiles')
              .update({ role: 'admin' })
              .eq('user_id', userId);
            
            // Refetch profile to get updated role
            setTimeout(() => {
              fetchUserProfile(userId);
            }, 100);
          }
        }
      } else {
        // Profile doesn't exist, create one
        await createUserProfile(userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: user.user.email || '',
          full_name: user.user.user_metadata?.full_name || user.user.email?.split('@')[0] || 'Unknown User',
          role: 'user'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return;
      }

      setUserProfile(newProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    isAdmin: boolean = false
  ) => {
    // Use environment variable or fallback to current origin
    const redirectUrl = import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin;
    
    console.log('Signing up user:', email, 'with redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: isAdmin ? 'admin' : 'user'
        }
      }
    });

    if (error) {
      console.error('Sign up error:', error);
      return { error };
    }

    if (data.user) {
      console.log('User created successfully:', data.user.id);
      
      // Create profile immediately (don't wait for email verification)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          full_name: fullName,
          role: isAdmin ? 'admin' : 'user'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setUserProfile(null);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const isAdmin = (userProfile: any) => {
    return userProfile?.role === 'admin';
  };

  const isSuperAdmin = (userProfile: any) => {
    return userProfile?.role === 'super_admin';
  };

  const isCategoryAdmin = (userProfile: any, category: string) => {
    const categoryRoleMap = {
      'IT': 'it_admin',
      'Maintenance': 'maintenance_admin', 
      'Housekeeping': 'housekeeping_admin'
    };
    return userProfile?.role === categoryRoleMap[category as keyof typeof categoryRoleMap];
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserProfile,
    isAdmin,
    isSuperAdmin,
    isCategoryAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}