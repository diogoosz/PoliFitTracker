"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from './types';
import { USERS } from './data';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This is a mock authentication provider. In a real app, you would integrate
// with Firebase Authentication here. The signInWithGoogle function would call
// the GoogleAuthProvider flow and you'd use onAuthStateChanged to set the user.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking for a logged-in user
    const storedUser = sessionStorage.getItem('poli-fit-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = () => {
    setLoading(true);
    // In a real implementation, here you would trigger Google sign-in.
    // For this mock, we'll just log in the non-admin user by default.
    // A real implementation should also validate the domain (@poli.digital).
    const mockUser = USERS.find(u => !u.isAdmin) || USERS[0];
    sessionStorage.setItem('poli-fit-user', JSON.stringify(mockUser));
    setUser(mockUser);
    setLoading(false);
    router.push('/dashboard');
  };

  const signOut = () => {
    sessionStorage.removeItem('poli-fit-user');
    setUser(null);
    router.push('/');
  };

  const value = { user, loading, signInWithGoogle, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
