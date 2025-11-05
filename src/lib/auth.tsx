
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User as AppUser } from './types';
import { useRouter } from 'next/navigation';
import { 
  useUser, 
  useAuth as useFirebaseAuth, 
  useFirestore
} from '@/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_DOMAIN = "poli.digital";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  const handleUserSync = useCallback(async (userToSync: FirebaseUser) => {
    // This is the core logic for syncing a Firebase user to a Firestore profile.
    if (!userToSync.email) {
      // This can happen briefly after login. If we don't have an email, we can't check the domain.
      // We log this and depend on the effect to run again when the user object is fully populated.
      console.log("Waiting for user object to populate with email...");
      return;
    }

    if (!userToSync.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      toast({
        title: 'Acesso Negado',
        description: `Apenas usuários com e-mail @${ALLOWED_DOMAIN} podem acessar.`,
        variant: 'destructive',
      });
      await firebaseSignOut(auth);
      setAppUser(null);
      setLoading(false);
      return;
    }

    if (firestore) {
      const userRef = doc(firestore, 'users', userToSync.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setAppUser(userSnap.data() as AppUser);
      } else {
        const newUser: AppUser = {
          id: userToSync.uid,
          name: userToSync.displayName || 'Usuário',
          email: userToSync.email,
          avatarUrl: userToSync.photoURL || `https://picsum.photos/seed/${userToSync.uid}/40/40`,
          isAdmin: false,
        };
        await setDoc(userRef, newUser);
        setAppUser(newUser);
      }
    }
    setLoading(false);

  }, [auth, firestore, toast]);

  useEffect(() => {
    // This effect runs whenever the firebaseUser object changes.
    if (firebaseUser) {
      // User is authenticated with Firebase.
      handleUserSync(firebaseUser);
    } else if (!isFirebaseUserLoading) {
      // No firebase user is logged in, and the initial check is complete.
      setAppUser(null);
      setLoading(false);
    }
    // isFirebaseUserLoading is critical here. We wait for Firebase to tell us it's done checking.
  }, [firebaseUser, isFirebaseUserLoading, handleUserSync]);


  const signInWithGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useEffect above will handle the rest once firebaseUser state changes.
    } catch (error: any) {
      // Only show a toast for actual errors, not for user closing the popup.
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error", error);
        toast({
            title: 'Erro de Login',
            description: 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.',
            variant: 'destructive',
        });
      }
      // Critical: ensure loading is false if any error occurs
      setLoading(false); 
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setAppUser(null);
    router.push('/');
  };

  const value = { user: appUser, loading, signInWithGoogle, signOut };

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
