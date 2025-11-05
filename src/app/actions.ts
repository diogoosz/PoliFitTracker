"use server";

import { z } from "zod";

const workoutSchema = z.object({
  duration: z.number().min(2400, "Workout must be at least 40 minutes."), // 40 minutes in seconds
  photos: z.array(z.string().min(1, "Photo is required")).length(2, "Two photos are required."),
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
      message: validatedFields.error.flatten().fieldErrors.duration?.[0] || validatedFields.error.flatten().fieldErrors.photos?.[0] || "Invalid data",
      type: "error" as const,
    };
  }
  
  // In a real application, you would save this to your database (e.g., Firestore)
  // along with the user's ID and the current date.
  console.log("Workout logged:", { duration, photos });
  
  return {
    message: "Workout logged successfully! Great job!",
    type: "success" as const,
  };
}
