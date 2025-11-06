"use server";

import { z } from "zod";
import { initializeServerApp } from "@/firebase/server-init";
import { Timestamp }from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK for server-side operations
const { firestore } = initializeServerApp();

const workoutSchema = z.object({
  userId: z.string().min(1, "O ID do usuário é obrigatório."),
  duration: z.number().min(120, "O treino deve ter pelo menos 2 minutos."), // 2 minutes in seconds
  photo1: z.string().min(1, "A foto 1 é obrigatória."),
  photo2: z.string().min(1, "A foto 2 é obrigatória."),
});

export async function logWorkout(prevState: any, formData: FormData) {
  const data = {
    userId: formData.get("userId") as string,
    duration: Number(formData.get("duration")),
    photo1: formData.get("photo1") as string,
    photo2: formData.get("photo2") as string,
  };
  
  const validatedFields = workoutSchema.safeParse(data);
  
  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.duration?.[0] 
        || validatedFields.error.flatten().fieldErrors.photo1?.[0] 
        || validatedFields.error.flatten().fieldErrors.photo2?.[0] 
        || "Dados inválidos",
      type: "error" as const,
    };
  }

  const { userId, duration, photo1, photo2 } = validatedFields.data;
  
  try {
    const startTime = Timestamp.now();
    const endTime = Timestamp.fromMillis(startTime.toMillis() + duration * 1000);

    const workoutCollectionRef = firestore.collection(`users/${userId}/workouts`);
    
    // Create the workout document with the photo data URLs directly
    await workoutCollectionRef.add({
        userId,
        startTime,
        endTime,
        duration: Math.floor(duration),
        photo1DataUrl: photo1,
        photo2DataUrl: photo2,
    });
    
    return {
      message: "Treino registrado com sucesso! Ótimo trabalho!",
      type: "success" as const,
    };
  } catch (error) {
    console.error("Error logging workout: ", error);
    const errorMessage = error instanceof Error ? error.message : "Um erro desconhecido ocorreu.";
    return {
        message: `Falha ao registrar o treino: ${errorMessage}`,
        type: "error" as const,
    };
  }
}
