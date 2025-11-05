"use server";

import { z } from "zod";
import { initializeServerApp } from "@/firebase/server-init";
import { Timestamp }from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';


// Initialize Firebase Admin SDK for server-side operations
const { firestore } = initializeServerApp();
const adminStorage = getAdminStorage();

const workoutSchema = z.object({
  userId: z.string().min(1, "O ID do usuário é obrigatório."),
  duration: z.number().min(120, "O treino deve ter pelo menos 2 minutos."), // 2 minutes in seconds
  photo1: z.string().min(1, "A foto 1 é obrigatória."),
  photo2: z.string().min(1, "A foto 2 é obrigatória."),
});

async function uploadPhoto(userId: string, workoutId: string, photoDataUrl: string, photoNumber: number): Promise<string> {
    const bucket = adminStorage.bucket();
    const filePath = `verifications/${userId}/${workoutId}/photo_${photoNumber}.jpg`;
    const file = bucket.file(filePath);
    const base64Data = photoDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    await file.save(buffer, {
        metadata: {
            contentType: 'image/jpeg',
        },
    });

    // Make the file public to get a downloadable URL
    await file.makePublic();
    
    return file.publicUrl();
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

    const workoutCollectionRef = firestore.collection(`users/${userId}/workouts`);
    
    // 1. Create the workout document first to get an ID
    const workoutRef = await workoutCollectionRef.add({
        userId,
        startTime,
        endTime,
        duration: Math.floor(duration),
        photo1Url: '', // Will be updated
        photo2Url: '', // Will be updated
    });

    const workoutId = workoutRef.id;
    
    // 2. Upload photos with the new workout ID
    const photo1Url = await uploadPhoto(userId, workoutId, photo1, 1);
    const photo2Url = await uploadPhoto(userId, workoutId, photo2, 2);

    // 3. Update the workout document with the photo URLs
    await workoutRef.update({
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
