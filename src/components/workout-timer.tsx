

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
const getRandomTime = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

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

  useEffect(() => {
    if (formState.type === 'success' && status === 'stopped') {
      setStatus('success');
      onWorkoutLogged(); // Notify parent that a new workout has been logged
    } else if (formState.type === 'error' && formState.message) {
      toast({
        title: 'Erro',
        description: formState.message,
        variant: 'destructive',
      });
      resetWorkout();
    }
  }, [formState, toast, onWorkoutLogged, resetWorkout, status]);

  useEffect(() => {
    let resetTimer: NodeJS.Timeout;
    if (status === 'success') {
      resetTimer = setTimeout(() => {
        resetWorkout();
      }, 5000);
    }
    return () => clearTimeout(resetTimer);
  }, [status, resetWorkout]);


  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Effect to run the timer and update elapsed seconds
  useEffect(() => {
    if (status === "running" && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      cleanup();
    }
  }, [status, startTime, cleanup]);
  
  // Effect to set photo prompt times ONLY when the timer starts
  useEffect(() => {
    if (status === 'running' && startTime) {
      // For 40 minute workout: 5-15 mins, then 25-35 mins
      const prompt1 = startTime + getRandomTime(5 * 60 * 1000, 15 * 60 * 1000); 
      const prompt2 = startTime + getRandomTime(25 * 60 * 1000, 35 * 60 * 1000);
      setPhotoPromptTimes([prompt1, prompt2]);
    }
  }, [status, startTime]);


  // Effect to check if it's time to prompt for a photo
  useEffect(() => {
    if (status === 'running' && photoPromptTimes[0] > 0) {
        const currentTime = Date.now();
        if (photos[0] === null && currentTime >= photoPromptTimes[0]) {
            setPhotoPromptIndex(0);
            setIsModalOpen(true);
        } else if (photos[0] !== null && photos[1] === null && currentTime >= photoPromptTimes[1]) {
            setPhotoPromptIndex(1);
            setIsModalOpen(true);
        }
    }
  }, [elapsedSeconds, status, photos, photoPromptTimes]);

  const handleStart = () => {
    if(hasTrainedToday) {
        toast({
            title: "Treino Já Registrado",
            description: "Você já registrou seu treino hoje. Volte amanhã para mais!",
            variant: "default",
        });
        return;
    }
    setStatus("running");
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setPhotos([null, null]);
  };

  const handleStop = () => {
    cleanup();
    const finalElapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    setElapsedSeconds(finalElapsedSeconds);
    setStatus("stopped");

    if (finalElapsedSeconds < MIN_WORKOUT_SECONDS) {
       toast({
        title: "Treino Muito Curto",
        description: `O treino não atingiu a duração mínima de 40 minutos. Você completou ${Math.floor(finalElapsedSeconds / 60)} minutos.`,
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
      const newPhotos: [string | null, string | null] = [...photos];
      newPhotos[photoPromptIndex] = photoDataUrl;
      setPhotos(newPhotos);
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
            <p className="text-sm text-muted-foreground">O timer será reiniciado em breve...</p>
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
