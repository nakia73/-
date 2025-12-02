
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastContext';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    // Initial Session Check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Session check warning:", error.message);
        }
        setUser(session?.user ?? null);
      } catch (e) {
        console.error("Auth initialization failed:", e);
      }
    };

    initSession();

    // Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      // Only update if changed to avoid unnecessary re-renders
      setUser(prev => {
        if (prev?.id === currentUser?.id) return prev;
        return currentUser;
      });
      
      if (_event === 'SIGNED_IN') {
        addToast(`Welcome back, ${currentUser?.email || 'User'}`, 'success');
      } else if (_event === 'SIGNED_OUT') {
        addToast("Logged out successfully", 'info');
      }
    });

    return () => subscription.unsubscribe();
  }, [addToast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    isAuthOpen,
    setAuthOpen,
    handleLogout
  };
};
