"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Camera, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photoDataUrl: string) => void;
}

export default function PhotoCaptureModal({ isOpen, onClose, onPhotoTaken }: PhotoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (isOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({
            variant: "destructive",
            title: "Acesso à Câmera Negado",
            description: "Por favor, habilite a permissão da câmera nas configurações do seu navegador.",
          });
        }
      } else {
        cleanupCamera();
      }
    };

    getCameraPermission();

    return () => {
      cleanupCamera();
    };
  }, [isOpen, toast, cleanupCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      if (context) {
        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data from the canvas
        const photoDataUrl = canvas.toDataURL("image/jpeg");
        onPhotoTaken(photoDataUrl);
        
        // No need to call onClose here, onPhotoTaken will trigger it in parent
      }
    } else {
       toast({
        variant: "destructive",
        title: "Câmera não disponível",
        description: "Não foi possível capturar a foto. Verifique as permissões da câmera.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Verificação com Foto</DialogTitle>
          <DialogDescription>
            Hora de um check-in rápido! Por favor, tire uma foto para verificar seu treino.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative flex items-center justify-center p-2 bg-secondary rounded-md aspect-video">
          <video ref={videoRef} className="w-full h-full rounded-md" autoPlay playsInline muted />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/80 rounded-md">
                <VideoOff className="w-16 h-16 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Câmera não disponível</p>
            </div>
          )}
        </div>

        {hasCameraPermission === false && (
            <Alert variant="destructive">
              <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
              <AlertDescription>
                Por favor, permita o acesso à câmera para usar esta funcionalidade.
              </AlertDescription>
            </Alert>
        )}
        
        <DialogFooter>
          <Button onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}>
            <Camera className="mr-2 h-4 w-4" /> Tirar Foto
          </Button>
        </DialogFooter>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}