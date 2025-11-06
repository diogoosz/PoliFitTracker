
"use client";

import { useState, useEffect, useRef, useCallback, useActionState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { logWorkout } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Square, Camera, Loader2, CheckCircle, PartyPopper } from "lucide-react";
import PhotoCaptureModal from "./photo-capture-modal";
import { useAuth } from "@/lib/auth";
import type { Workout } from "@/lib/types";
import { isToday } from "date-fns";

const MIN_WORKOUT_SECONDS = 40 * 60; // 40 minutes

// Helper to format time
const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds]
    .map((v) => (v < 10 ? "0" + v : v))
    .join(":");
};

// Helper for random time
const getRandomTimeInMs = (minSeconds: number, maxSeconds: number) => 
  (Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds) * 1000;


interface WorkoutTimerProps {
  onWorkoutLogged: () => void;
  userWorkouts: Workout[];
}

export function WorkoutTimer({ onWorkoutLogged, userWorkouts }: WorkoutTimerProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "stopped" | "success">("idle");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [photos, setPhotos] = useState<[string | null, string | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [photoPromptIndex, setPhotoPromptIndex] = useState<0 | 1 | null>(null);
  
  const [photoPromptTimes, setPhotoPromptTimes] = useState<[number, number]>([0,0]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const [formState, formAction, isSubmitting] = useActionState(logWorkout, { message: "", type: "" });
  
  const hasTrainedToday = useMemo(() => {
    return userWorkouts.some(workout => 
        workout.startTime && isToday(workout.startTime.toDate())
    );
  }, [userWorkouts]);

  // Register Service Worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }
  }, []);
  
  // This effect ensures the visual timer updates instantly when the app is brought to the foreground.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'running' && startTime) {
        // Recalculate elapsed time instantly on becoming visible
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, startTime]);


  const showNotification = (title: string, options: NotificationOptions) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
       navigator.serviceWorker.ready.then(registration => {
         registration.showNotification(title, options);
       });
    }
  };

  const schedulePhotoPrompts = (promptTimes: [number, number]) => {
      if (Notification.permission !== 'granted') return;

      promptTimes.forEach((time, index) => {
          if (time > 0) {
              setTimeout(() => {
                  showNotification('Poli Fit Tracker', {
                      body: `Hora da sua ${index + 1}ª verificação com foto!`,
                      icon: '/icon.svg',
                      tag: `photo-prompt-${index}`
                  });
              }, time);
          }
      });
  };

  const resetWorkout = useCallback(() => {
    setStatus("idle");
    setStartTime(null);
    setElapsedSeconds(0);
    setPhotos([null, null]);
    setPhotoPromptTimes([0,0]);

    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
  }, []);

  const checkPhotoPrompts = useCallback(() => {
    if (status !== 'running' || !startTime) return;

    const currentElapsedTime = Date.now() - startTime;
    photoPromptTimes.forEach((time, index) => {
        if (time > 0 && currentElapsedTime >= time && photos[index] === null) {
            setIsModalOpen(true);
            setPhotoPromptIndex(index as 0 | 1);
        }
    });
  }, [status, startTime, photoPromptTimes, photos]);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        if (startTime) {
           setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }
        checkPhotoPrompts();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, startTime, checkPhotoPrompts]);


  useEffect(() => {
    if (formState.type === 'success' && status === 'stopped') {
      setStatus('success');
      onWorkoutLogged();
    } else if (formState.type === 'error' && formState.message) {
      toast({
        title: 'Erro',
        description: formState.message,
        variant: 'destructive',
      });
    }
  }, [formState, toast, onWorkoutLogged, status]);

  useEffect(() => {
    let resetTimer: NodeJS.Timeout;
    if (status === 'success') {
      resetTimer = setTimeout(() => {
        resetWorkout();
      }, 5000);
    }
    return () => clearTimeout(resetTimer);
  }, [status, resetWorkout]);

  const handleStart = async () => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
              toast({
                  title: "Notificações Desativadas",
                  description: "Você não receberá lembretes para as fotos.",
                  variant: "default",
              });
          }
      } else if (Notification.permission === 'denied') {
          toast({
              title: "Notificações Bloqueadas",
              description: "Habilite as notificações nas configurações do seu navegador para os lembretes.",
              variant: "destructive",
          });
      }
    } else {
        toast({
            title: "Notificações Não Suportadas",
            description: "Seu navegador não suporta notificações. Adicione o app à sua tela inicial para habilitar.",
            variant: "default",
        });
    }

    if(hasTrainedToday) {
        toast({
            title: "Treino Já Registrado",
            description: "Você já registrou seu treino hoje. Volte amanhã para mais!",
            variant: "default",
        });
        return;
    }
    const now = Date.now();
    setStatus("running");
    setStartTime(now);
    setElapsedSeconds(0);
    setPhotos([null, null]);
    
    // Random times between 1-20 min and 21-40 min
    const times: [number, number] = [
      getRandomTimeInMs(1 * 60, 20 * 60), 
      getRandomTimeInMs(21 * 60, 40 * 60)
    ];
    setPhotoPromptTimes(times);
    schedulePhotoPrompts(times);
  };

  const handleStop = () => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }
    
    const finalElapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedSeconds;
    setElapsedSeconds(finalElapsedSeconds);
    setStatus("stopped");

    if (finalElapsedSeconds < MIN_WORKOUT_SECONDS) {
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
      resetWorkout();
      return;
    }
    
    if (!user) {
      toast({
        title: "Usuário não encontrado",
        description: "Você precisa estar logado para registrar um treino.",
        variant: "destructive",
      });
      resetWorkout();
      return;
    }
    
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('duration', String(finalElapsedSeconds));
    formData.append('photo1', photos[0]);
    formData.append('photo2', photos[1]);
    formAction(formData);
  };

  const handlePhotoTaken = (photoDataUrl: string) => {
    if (photoPromptIndex !== null) {
      setPhotos(prevPhotos => {
        const newPhotos: [string | null, string | null] = [...prevPhotos];
        if (newPhotos[photoPromptIndex] === null) {
            newPhotos[photoPromptIndex] = photoDataUrl;
        }
        return newPhotos;
      });
    }
    setIsModalOpen(false);
    setPhotoPromptIndex(null);
  };


  const photosTakenCount = photos.filter(p => p !== null).length;

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
          onClose={() => setIsModalOpen(false)}
          onPhotoTaken={handlePhotoTaken}
        />
      </CardContent>
    </Card>
  );
}
