"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User as AppUser } from './types';
import { useRouter } from 'next/navigation';
import { 
  useUser, 
  useAuth as useFirebaseAuth, 
  useFirestore,
  useMemoFirebase
} from '@/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: firebaseUser, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const syncUser = async () => {
      setLoading(true);
      if (firebaseUser && firestore) {
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setAppUser(userSnap.data() as AppUser);
        } else {
          // Create user profile if it doesn't exist
          const newUser: AppUser = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuário',
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
            isAdmin: false, // Default to not admin
          };
          await setDoc(userRef, newUser);
          setAppUser(newUser);
        }
      } else {
        setAppUser(null);
      }
       setLoading(false);
    };

    syncUser();
  }, [firebaseUser, firestore]);

  const signInWithGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Google Sign-In Error", error);
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setAppUser(null);
    router.push('/');
  };

  const value = { user: appUser, loading: isUserLoading || loading, signInWithGoogle, signOut };

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
