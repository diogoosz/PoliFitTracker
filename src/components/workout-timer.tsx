"use client";

import { useState, useEffect, useRef, useCallback, useActionState } from "react";
import { useToast } from "@/hooks/use-toast";
import { logWorkout } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Square, Camera, Loader2 } from "lucide-react";
import PhotoCaptureModal from "./photo-capture-modal";

const MIN_WORKOUT_SECONDS = 40 * 60;

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

export function WorkoutTimer({ onWorkoutLogged }: { onWorkoutLogged: () => void }) {
  const [status, setStatus] = useState<"idle" | "running" | "stopped">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [photos, setPhotos] = useState<[string | null, string | null]>([null, null]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [photoPromptIndex, setPhotoPromptIndex] = useState<0 | 1 | null>(null);
  
  const [photoPromptTimes, setPhotoPromptTimes] = useState<[number, number]>([0,0]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const [formState, formAction] = useActionState(logWorkout, { message: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (formState.message) {
      toast({
        title: formState.type === 'success' ? 'Sucesso!' : 'Erro',
        description: formState.message,
        variant: formState.type === 'error' ? 'destructive' : 'default',
      });
      if (formState.type === 'success') {
        resetWorkout();
        onWorkoutLogged();
      }
      setIsSubmitting(false);
    }
  }, [formState, toast, onWorkoutLogged]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (status === "running") {
      const now = Math.floor(Date.now() / 1000);
      const prompt1 = getRandomTime(now + 60, now + (MIN_WORKOUT_SECONDS / 2) - 60); // between 1 min and 19 mins
      const prompt2 = getRandomTime(now + (MIN_WORKOUT_SECONDS / 2), now + MIN_WORKOUT_SECONDS - 60); // between 20 mins and 39 mins
      setPhotoPromptTimes([prompt1, prompt2]);

      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      cleanup();
    }
  }, [status, cleanup]);

  useEffect(() => {
    if (status === 'running') {
        const currentTime = Math.floor(Date.now() / 1000);
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
    setStatus("running");
    setElapsedSeconds(0);
    setPhotos([null, null]);
  };

  const handleStop = () => {
    setStatus("stopped");
    cleanup();

    if (elapsedSeconds < MIN_WORKOUT_SECONDS) {
       toast({
        title: "Treino Muito Curto",
        description: `Seu treino deve ter no mínimo 40 minutos. Você completou apenas ${Math.floor(elapsedSeconds / 60)} minutos.`,
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
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('duration', String(elapsedSeconds));
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

  const resetWorkout = () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setPhotos([null, null]);
  }

  const photosTakenCount = photos.filter(p => p !== null).length;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-medium font-headline">Sessão de Treino</CardTitle>
        <Timer className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-6 pt-6">
        <div className="text-6xl font-bold font-mono text-primary tabular-nums tracking-tighter">
          {formatTime(elapsedSeconds)}
        </div>
        
        {status === "idle" && (
          <Button size="lg" className="w-48" onClick={handleStart}>
            <Play className="mr-2 h-5 w-5" /> Iniciar Treino
          </Button>
        )}
        
        {status === "running" && (
          <div className="w-full text-center space-y-4">
              <Button size="lg" className="w-48" onClick={handleStop} variant="destructive">
                <Square className="mr-2 h-5 w-5" /> Parar Treino
              </Button>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span>{photosTakenCount}/2 fotos tiradas</span>
              </div>
          </div>
        )}

        {status === "stopped" && (
           <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Enviando seu treino...</p>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
