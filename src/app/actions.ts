"use server";

import { z } from "zod";

const workoutSchema = z.object({
  duration: z.number().min(2400, "O treino deve ter pelo menos 40 minutos."), // 40 minutes in seconds
  photos: z.array(z.string().min(1, "A foto é obrigatória")).length(2, "São necessárias duas fotos."),
});

export async function logWorkout(prevState: any, formData: FormData) {
  const duration = Number(formData.get("duration"));
  const photos = [
    formData.get("photo1") as string,
    formData.get("photo2") as string,
  ];

  const validatedFields = workoutSchema.safeParse({ duration, photos });
  
  if (!validatedFields.success) {
    return {
      message: validatedFields.error.flatten().fieldErrors.duration?.[0] || validatedFields.error.flatten().fieldErrors.photos?.[0] || "Dados inválidos",
      type: "error" as const,
    };
  }
  
  // In a real application, you would save this to your database (e.g., Firestore)
  // along with the user's ID and the current date.
  console.log("Workout logged:", { duration, photos });
  
  return {
    message: "Treino registrado com sucesso! Ótimo trabalho!",
    type: "success" as const,
  };
}
