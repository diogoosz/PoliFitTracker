
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
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(true);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);
  const [isUserSyncing, setIsUserSyncing] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Effect to listen for maintenance mode changes
  useEffect(() => {
    if (!firestore) {
      setIsMaintenanceLoading(false);
      return;
    };
    const settingsRef = doc(firestore, 'settings', 'app_status');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const settings = doc.data() as AppSettings;
        setIsMaintenanceMode(settings.isMaintenanceMode);
      } else {
        setIsMaintenanceMode(false);
      }
      setIsMaintenanceLoading(false);
    }, () => {
      // On error, assume not in maintenance
      setIsMaintenanceMode(false);
      setIsMaintenanceLoading(false);
    });
    return () => unsubscribe();
  }, [firestore]);


  const handleUserSync = useCallback(async (userToSync: FirebaseUser | null) => {
    // If user is null (logged out), reset state
    if (!userToSync) {
      setAppUser(null);
      setIsUserSyncing(false);
      return;
    }
    
    setIsUserSyncing(true);
    
    if (!auth || !firestore) {
      setAppUser(null);
      setIsUserSyncing(false);
      return;
    }
    
    if (!userToSync.email) {
      console.log("Waiting for user object to populate with email...");
      // This case might happen on fast reloads, we'll let the listener run again
      setIsUserSyncing(false);
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
      setIsUserSyncing(false);
      return;
    }

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
    setIsUserSyncing(false);

  }, [auth, firestore, toast]);

  useEffect(() => {
    handleUserSync(firebaseUser);
  }, [firebaseUser, handleUserSync]);

  // This effect handles all redirection logic once we have all the info.
  useEffect(() => {
    // Wait until we know maintenance status and user auth status
    if (isFirebaseUserLoading || isMaintenanceLoading || isUserSyncing) {
      return;
    }
    
    // If in maintenance mode
    if (isMaintenanceMode) {
      // Allow admins to go anywhere, but redirect non-admins to maintenance page
      if (!appUser?.isAdmin && pathname !== '/maintenance') {
        router.push('/maintenance');
      }
      return;
    }

    // If NOT in maintenance mode
    if (appUser) { // User is logged in
        if(pathname === '/maintenance' || pathname === '/') {
           router.push('/dashboard');
        }
    } else { // User is logged out
        if(pathname !== '/') {
            // Allow staying on maintenance page if they land there, but redirect from others
            if (pathname !== '/maintenance') {
                 router.push('/');
            }
        }
    }

  }, [isMaintenanceMode, appUser, isFirebaseUserLoading, isMaintenanceLoading, isUserSyncing, pathname, router]);


  const signInWithGoogle = async () => {
    if (!auth) {
       toast({
        title: 'Serviço indisponível',
        description: 'A autenticação não está configurada.',
        variant: 'destructive',
      });
      return;
    }
    
    // We can check maintenance status before even showing the popup
    if (isMaintenanceMode) {
      toast({
          title: "Em Manutenção",
          description: "O login está temporariamente desativado, exceto para administradores.",
          variant: "default",
      });
    }

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
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setAppUser(null); // Clear local user state immediately
    router.push('/');
  };

  const isLoading = isFirebaseUserLoading || isMaintenanceLoading || isUserSyncing;

  // While loading, show a full-screen loader to prevent flashes of content
  if (isLoading && pathname !== '/maintenance' && pathname !== '/') {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const value = { user: appUser, loading: isLoading, signInWithGoogle, signOut, isMaintenanceMode };

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
