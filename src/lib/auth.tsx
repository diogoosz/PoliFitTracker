
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { User as AppUser, AppSettings } from './types';
import { useRouter, usePathname } from 'next/navigation';
import { 
  useUser, 
  useFirebaseAuth, 
  useFirestore,
  useFirebase
} from '@/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as FirebaseUser } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
  isMaintenanceMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_DOMAIN = "poli.digital";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const { areServicesAvailable } = useFirebase();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(true); // Default to true while checking
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Effect to listen for maintenance mode changes
  useEffect(() => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'settings', 'app_status');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const settings = doc.data() as AppSettings;
        setIsMaintenanceMode(settings.isMaintenanceMode);
      } else {
        // If the document doesn't exist, assume maintenance is off.
        setIsMaintenanceMode(false);
      }
    });
    return () => unsubscribe();
  }, [firestore]);


  const handleUserSync = useCallback(async (userToSync: FirebaseUser) => {
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }
    
    if (!userToSync.email) {
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

    const userRef = doc(firestore, 'users', userToSync.uid);
    const userSnap = await getDoc(userRef);
    let finalUser: AppUser;
    if (userSnap.exists()) {
      finalUser = userSnap.data() as AppUser;
      setAppUser(finalUser);
    } else {
      const newUser: AppUser = {
        id: userToSync.uid,
        name: userToSync.displayName || 'Usuário',
        email: userToSync.email,
        avatarUrl: userToSync.photoURL || `https://picsum.photos/seed/${userToSync.uid}/40/40`,
        isAdmin: false,
      };
      await setDoc(userRef, newUser);
      finalUser = newUser;
      setAppUser(newUser);
    }

    // Maintenance mode check
    if (isMaintenanceMode && !finalUser.isAdmin) {
      router.push('/maintenance');
    }

    setLoading(false);

  }, [auth, firestore, toast, isMaintenanceMode, router]);

  useEffect(() => {
    if (!areServicesAvailable) {
      setLoading(false);
      setAppUser(null);
      return;
    }

    if (firebaseUser) {
      handleUserSync(firebaseUser);
    } else if (!isFirebaseUserLoading) {
      setAppUser(null);
      setLoading(false);
    }
  }, [firebaseUser, isFirebaseUserLoading, handleUserSync, areServicesAvailable]);

  // This effect handles redirection for non-admin users if maintenance mode is turned ON
  // while they are already using the app.
  useEffect(() => {
    if (isMaintenanceMode && appUser && !appUser.isAdmin && pathname !== '/maintenance') {
      router.push('/maintenance');
    }
  }, [isMaintenanceMode, appUser, pathname, router]);

  const signInWithGoogle = async () => {
    if (!auth) {
       toast({
        title: 'Serviço indisponível',
        description: 'A autenticação não está configurada.',
        variant: 'destructive',
      });
      return;
    }

    if (isMaintenanceMode) {
      toast({
          title: "Em Manutenção",
          description: "O aplicativo está em manutenção. Tente novamente mais tarde.",
          variant: "default",
      });
      // We still allow sign-in attempt, as an admin might be trying to log in.
      // The logic in handleUserSync will sort out who gets access.
    }
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
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

  // While loading user or settings, show a full-screen loader to prevent flashes of content
  if ((loading || isFirebaseUserLoading) && pathname !== '/maintenance') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If in maintenance and user is not an admin, and not already on the maintenance page, render maintenance.
  if (isMaintenanceMode && (!appUser || !appUser.isAdmin) && pathname !== '/maintenance' && pathname !== '/') {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  const value = { user: appUser, loading, signInWithGoogle, signOut, isMaintenanceMode };

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
