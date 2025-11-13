
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { logWorkoutClient } from "@/app/client-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Square, Camera, Loader2, CheckCircle, PartyPopper } from "lucide-react";
import PhotoCaptureModal from "./photo-capture-modal";
import { useAuth } from "@/lib/auth";
import type { Workout } from "@/lib/types";
import { isToday } from "date-fns";
import { IosInstallPrompt } from "./ios-install-prompt";
import { useFirestore } from "@/firebase";
import { useSearchParams } from 'next/navigation';
import { getFCMToken } from '@/lib/notification-manager';


// ====================================================================
// CONFIGURAÇÃO CENTRALIZADA DO TREINO
// ====================================================================
// Duração total do treino em minutos.
const WORKOUT_DURATION_MINUTES = 1;
// ====================================================================

// --- Conversões para segundos (não editar) ---
const WORKOUT_DURATION_SECONDS = WORKOUT_DURATION_MINUTES * 60;
// ====================================================================


// Helper to format time
const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? "0" + v : v))
    .join(":");
};


interface WorkoutTimerProps {
  onWorkoutLogged: () => void;
  userWorkouts: Workout[];
}

export function WorkoutTimer({ onWorkoutLogged, userWorkouts }: WorkoutTimerProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"idle" | "running" | "stopped" | "submitting" | "success">("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [photos, setPhotos] = useState<[string | null, string | null]>([null, null]);
  const [photoTimestamps, setPhotoTimestamps] = useState<[Date | null, Date | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIosInstallPromptOpen, setIsIosInstallPromptOpen] = useState(false);
  const [photoPromptIndex, setPhotoPromptIndex] = useState<0 | 1 | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const hasTrainedToday = useMemo(() => {
    return userWorkouts.some(workout => 
        workout.startTime && isToday(workout.startTime.toDate())
    );
  }, [userWorkouts]);

  const resetWorkout = useCallback(() => {
    setStatus("idle");
    setStartTime(null);
    setStartTimeDate(null);
    setElapsedSeconds(0);
    setPhotos([null, null]);
    setPhotoTimestamps([null, null]);

    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
  }, []);

  const checkAndPromptForPhoto = useCallback(() => {
      if (status !== 'running' || !startTime || photoPromptIndex !== null) return;
  
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      
      const PHOTO_1_INTERVAL_SECONDS = { min: WORKOUT_DURATION_SECONDS * 0.30, max: WORKOUT_DURATION_SECONDS * 0.55 };
      const PHOTO_2_INTERVAL_SECONDS = { min: WORKOUT_DURATION_SECONDS * 0.65, max: WORKOUT_DURATION_SECONDS * 0.85 };
  
      const shouldPrompt = (interval: { min: number, max: number }, index: 0 | 1) =>
          currentElapsed >= interval.min &&
          currentElapsed <= interval.max &&
          !photos[index];
  
      if (shouldPrompt(PHOTO_1_INTERVAL_SECONDS, 0)) {
          setPhotoPromptIndex(0);
          setIsModalOpen(true);
      } else if (shouldPrompt(PHOTO_2_INTERVAL_SECONDS, 1)) {
          setPhotoPromptIndex(1);
          setIsModalOpen(true);
      }
  }, [status, startTime, photos, photoPromptIndex, setPhotoPromptIndex, setIsModalOpen]);


  // This effect handles opening the camera modal when arriving via a notification link.
  useEffect(() => {
    const photoPrompt = searchParams.get('photo_prompt');
    if (status === 'running') {
      if (photoPrompt === '1' && !photos[0]) {
        setPhotoPromptIndex(0);
        setIsModalOpen(true);
      } else if (photoPrompt === '2' && !photos[1]) {
        setPhotoPromptIndex(1);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, status, photos]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'running' && startTime) {
        const currentElapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(currentElapsedSeconds);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, startTime]);


  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        const newElapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        setElapsedSeconds(newElapsedSeconds);
        // This check runs every second to see if it's time to open the camera modal
        // when the app is in the foreground.
        checkAndPromptForPhoto();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, startTime, checkAndPromptForPhoto]);

  useEffect(() => {
    let resetTimer: NodeJS.Timeout;
    if (status === 'success') {
      onWorkoutLogged();
      resetTimer = setTimeout(() => {
        resetWorkout();
      }, 5000);
    }
    return () => clearTimeout(resetTimer);
  }, [status, resetWorkout, onWorkoutLogged]);

  const startWorkoutAndScheduleNotifications = async () => {
      if (!user) return;
      
      const fcmToken = await getFCMToken();
      
      if (!fcmToken) {
          toast({ title: 'Aviso', description: 'Permissão de notificação negada. O app não irá te notificar se estiver em segundo plano.' });
          // Proceed without notifications, the local timer will still work.
      } else {
        try {
          const response = await fetch('/api/schedule-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken, userId: user.id }),
          });
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Falha desconhecida");
          }
        } catch (error) {
            console.error("Failed to schedule notifications:", error);
            // Don't block the workout from starting, just log the error and notify the user.
             toast({ title: 'Aviso', description: 'Não foi possível agendar as notificações push no servidor.' });
        }
      }
  };


  const handleStart = async () => {
     if(hasTrainedToday) {
        toast({
            title: "Treino Já Registrado",
            description: "Você já registrou seu treino hoje. Volte amanhã para mais!",
            variant: "default",
        });
        return;
    }

    // Schedule notifications first. This will trigger the permission prompt if needed.
    await startWorkoutAndScheduleNotifications();
    
    // After attempting to schedule, start the timer.
    const now = new Date();
    setStatus("running");
    setStartTime(now.getTime());
    setStartTimeDate(now);
    setElapsedSeconds(0);
    setPhotos([null, null]);
    setPhotoTimestamps([null, null]);
  };

  const handleStop = async () => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }
    
    const finalElapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedSeconds;
    setElapsedSeconds(finalElapsedSeconds);
    setStatus("stopped");

    if (finalElapsedSeconds < WORKOUT_DURATION_SECONDS) {
       toast({
        title: "Treino Muito Curto",
        description: `O treino não atingiu a duração mínima para ser registrado.`,
        variant: "destructive",
      });
      resetWorkout();
      return;
    }

    if (!photos[0] || !photos[1]) {
      toast({
        title: "Verificação Incompleta",
        description: "Você deve completar as duas verificações com foto para registrar seu treino.",
        variant: "destructive",
      });
      // Reset the workout so the user is not stuck.
      resetWorkout();
      return;
    }
    
    if (!user || !startTimeDate || !photoTimestamps[0] || !photoTimestamps[1] || !photos[0] || !photos[1]) {
      toast({
        title: "Dados incompletos para registrar",
        description: "Ocorreu um erro ao coletar todos os dados necessários para o registro.",
        variant: "destructive",
      });
      resetWorkout();
      return;
    }
    
    if (!firestore) {
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível acessar o Firestore. Recarregue o app.",
        variant: "destructive",
      });
      resetWorkout();
      return;
    }
    
    setStatus("submitting");

    try {
        await logWorkoutClient(
            firestore, 
            user, 
            startTimeDate, 
            finalElapsedSeconds, 
            photos[0], 
            photos[1],
            photoTimestamps[0],
            photoTimestamps[1]
        );
        setStatus("success");
    } catch (error) {
        console.error("Error logging workout: ", error);
        const errorMessage = error instanceof Error ? error.message : "Um erro desconhecido ocorreu.";
        toast({
            title: 'Erro',
            description: `Falha ao registrar o treino: ${errorMessage}`,
            variant: 'destructive',
        });
        // Reset to a state where the user can try again without losing data
        setStatus("stopped");
    }
  };

  const handlePhotoTaken = (photoDataUrl: string) => {
    if (photoPromptIndex !== null) {
      const now = new Date();
      setPhotos(prevPhotos => {
        const newPhotos: [string | null, string | null] = [...prevPhotos];
        newPhotos[photoPromptIndex] = photoDataUrl;
        return newPhotos;
      });
      setPhotoTimestamps(prevTimestamps => {
          const newTimestamps: [Date | null, Date | null] = [...prevTimestamps];
          newTimestamps[photoPromptIndex] = now;
          return newTimestamps;
      });
    }
    setIsModalOpen(false);
    setPhotoPromptIndex(null);
  };

  const photosTakenCount = photos.filter(p => p !== null).length;
  const isSubmitting = status === "submitting";

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-medium font-headline">Sessão de Treino</CardTitle>
        <Timer className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-6 pt-6 min-h-[220px]">
        {status === "success" ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">Treino registrado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Seu treino está pendente de aprovação.</p>
          </div>
        ) : (
          <>
            <div className="text-5xl sm:text-6xl font-bold font-mono text-primary tabular-nums tracking-tighter">
              {formatTime(elapsedSeconds)}
            </div>
            
            {status === "idle" && (
              <div className="text-center space-y-2">
                <Button 
                  size="lg" 
                  className="w-48" 
                  onClick={handleStart} 
                  disabled={isSubmitting || hasTrainedToday}
                >
                  <Play className="mr-2 h-5 w-5" /> Iniciar Treino
                </Button>
                {hasTrainedToday && (
                  <p className="text-sm text-green-600 flex items-center justify-center gap-2">
                    <PartyPopper className="h-4 w-4" />
                    Você já treinou hoje!
                  </p>
                )}
              </div>
            )}
            
            {(status === "running" || status === "stopped") && !isSubmitting && (
              <div className="w-full text-center space-y-4">
                  <Button size="lg" className="w-48" onClick={handleStop} variant="destructive" disabled={isSubmitting}>
                    <Square className="mr-2 h-5 w-5" /> Parar Treino
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      <span>{photosTakenCount}/2 fotos tiradas</span>
                  </div>
              </div>
            )}

            {isSubmitting && (
              <div className="flex flex-col items-center gap-4">
                  <p className="text-muted-foreground">Enviando seu treino...</p>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
        
        <PhotoCaptureModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setPhotoPromptIndex(null);
          }}
          onPhotoTaken={handlePhotoTaken}
        />
        <IosInstallPrompt
          isOpen={isIosInstallPromptOpen}
          onClose={() => setIsIosInstallPromptOpen(false)}
        />
      </CardContent>
    </Card>
  );
}
