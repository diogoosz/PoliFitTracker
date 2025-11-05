
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
  const { user: firebaseUser, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const syncUser = async () => {
      setLoading(true);
      if (firebaseUser && firestore) {
        // Check domain again in case user was already logged in
        if (!firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
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
  }, [firebaseUser, firestore, auth, toast]);

  const signInWithGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        toast({
            title: 'Domínio de E-mail Não Autorizado',
            description: `Por favor, utilize uma conta com o domínio @${ALLOWED_DOMAIN}.`,
            variant: 'destructive',
        });
        await firebaseSignOut(auth);
        setLoading(false);
        return;
      }
      // onAuthStateChanged will handle user creation and redirection.
      // setLoading will be handled by the useEffect hook.
    } catch (error: any) {
      // Always reset loading state on error
      setLoading(false); 
      
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error", error);
         toast({
            title: 'Erro de Login',
            description: 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.',
            variant: 'destructive',
        });
      }
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
