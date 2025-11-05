
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  
  useEffect(() => {
    // This effect's job is to sync the firebaseUser to our app's user profile in Firestore
    const syncUser = async () => {
      // If firebaseUser is present, we have a session.
      if (firebaseUser) {
        // Domain check
        if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
          toast({
            title: 'Acesso Negado',
            description: `Apenas usuários com e-mail @${ALLOWED_DOMAIN} podem acessar.`,
            variant: 'destructive',
          });
          await firebaseSignOut(auth); // Sign out the invalid user
          setAppUser(null);
          setLoading(false); // Stop loading, we have a result (no user)
          return;
        }

        // User is valid, get or create their profile from Firestore
        if (firestore) {
          const userRef = doc(firestore, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setAppUser(userSnap.data() as AppUser);
          } else {
            const newUser: AppUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/40/40`,
              isAdmin: false,
            };
            await setDoc(userRef, newUser);
            setAppUser(newUser);
          }
        }
        setLoading(false); // Stop loading, we have a user
      } else if (!isFirebaseUserLoading) {
        // If firebaseUser is null AND the initial auth check is complete
        setAppUser(null);
        setLoading(false); // Stop loading, we know there's no user
      }
    };

    syncUser();
  }, [firebaseUser, isFirebaseUserLoading, firestore, auth, toast]);

  const signInWithGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useEffect above will handle the rest once firebaseUser changes.
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error", error);
         toast({
            title: 'Erro de Login',
            description: 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.',
            variant: 'destructive',
        });
      }
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
