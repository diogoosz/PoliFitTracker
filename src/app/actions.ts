"use server";

import { z } from "zod";
import { getFirestore, Timestamp, addDoc, collection, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { initializeServerApp } from "@/firebase/server-init";

// Initialize Firebase Admin SDK for server-side operations
const { firestore, storage } = initializeServerApp();

const workoutSchema = z.object({
  userId: z.string().min(1, "O ID do usuário é obrigatório."),
  duration: z.number().min(2400, "O treino deve ter pelo menos 40 minutos."), // 40 minutes in seconds
  photo1: z.string().min(1, "A foto 1 é obrigatória."),
  photo2: z.string().min(1, "A foto 2 é obrigatória."),
});

async function uploadPhoto(userId: string, workoutId: string, photoDataUrl: string, photoNumber: number): Promise<string> {
    const filePath = `verifications/${userId}/${workoutId}/photo_${photoNumber}.jpg`;
    const storageRef = ref(storage, filePath);
    const base64Data = photoDataUrl.split(',')[1];
    await uploadString(storageRef, base64Data, 'base64', { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
}


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

    // 1. Create the workout document first to get an ID
    const workoutRef = await addDoc(collection(firestore, `users/${userId}/workouts`), {
        userId,
        startTime,
        endTime,
        duration,
        photo1Url: '', // Will be updated
        photo2Url: '', // Will be updated
    });

    const workoutId = workoutRef.id;
    
    // 2. Upload photos with the new workout ID
    const photo1Url = await uploadPhoto(userId, workoutId, photo1, 1);
    const photo2Url = await uploadPhoto(userId, workoutId, photo2, 2);

    // 3. Update the workout document with the photo URLs
    await updateDoc(workoutRef, {
        photo1Url,
        photo2Url,
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
