
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (_event === 'SIGNED_IN') {
        addToast(`Welcome back, ${currentUser?.email}`, 'success');
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
