"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photoDataUrl: string) => void;
}

export default function PhotoCaptureModal({ isOpen, onClose, onPhotoTaken }: PhotoCaptureModalProps) {
  const handleCapture = () => {
    // In a real app, you would use navigator.mediaDevices.getUserMedia to access the camera
    // and capture an image. For this mock, we'll use a placeholder from picsum.
    const photoUrl = `https://picsum.photos/seed/${Date.now()}/400/300`;
    onPhotoTaken(photoUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Verificação com Foto</DialogTitle>
          <DialogDescription>
            Hora de um check-in rápido! Por favor, tire uma foto para verificar seu treino.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-8 bg-secondary rounded-md">
            {/* This would be replaced by the camera feed */}
            <Camera className="w-24 h-24 text-muted-foreground" />
        </div>
        <DialogFooter>
          <Button onClick={handleCapture} className="w-full">
            <Camera className="mr-2 h-4 w-4" /> Tirar Foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
