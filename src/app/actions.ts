
"use server";

import { z } from "zod";
import { initializeServerApp } from "@/firebase/server-init";
import { Timestamp }from 'firebase-admin/firestore';
import { revalidatePath } from "next/cache";

// Initialize Firebase Admin SDK for server-side operations
const { firestore } = initializeServerApp();

const workoutSchema = z.object({
  userId: z.string().min(1, "O ID do usuário é obrigatório."),
  duration: z.number().min(2400, "O treino deve ter pelo menos 40 minutos."), // 40 minutes in seconds
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
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return {
      message: firstError || "Dados inválidos.",
      type: "error" as const,
    };
  }

  const { userId, duration, photo1, photo2 } = validatedFields.data;
  
  try {
    const startTime = Timestamp.now();
    // Correctly calculate endTime based on duration in seconds
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
        status: 'pending', // Default status
    });
    
    revalidatePath('/dashboard');
    revalidatePath('/admin');

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

const updateStatusSchema = z.object({
  userId: z.string().min(1),
  workoutId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
});

export async function updateWorkoutStatus(
  prevState: any,
  formData: FormData
) {
  const validatedFields = updateStatusSchema.safeParse({
    userId: formData.get("userId"),
    workoutId: formData.get("workoutId"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      message: "Dados inválidos para atualização.",
      type: "error" as const,
    };
  }

  const { userId, workoutId, status } = validatedFields.data;

  try {
    const workoutRef = firestore.doc(`users/${userId}/workouts/${workoutId}`);
    await workoutRef.update({ status });
    
    // Revalidate paths to refresh data on the client
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return {
      message: `Treino ${status === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso.`,
      type: "success" as const,
    };
  } catch (error) {
    console.error("Error updating workout status: ", error);
    return {
      message: "Falha ao atualizar o status do treino.",
      type: "error" as const,
    };
  }
}
