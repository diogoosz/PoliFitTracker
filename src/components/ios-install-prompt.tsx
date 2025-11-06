
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Share } from "lucide-react";

interface IosInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IosInstallPrompt({ isOpen, onClose }: IosInstallPromptProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Adicionar à Tela de Início</DialogTitle>
          <DialogDescription>
            Siga estes passos para receber lembretes de fotos durante seu treino.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                </div>
                <p className="text-sm">Toque no ícone de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
            </div>
             <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                </div>
                <p className="text-sm">Deslize para cima e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
            
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg border">
                 <Image
                    src="https://picsum.photos/seed/ios-pwa/600/338"
                    alt="Tutorial de como instalar o app no iOS"
                    fill
                    className="object-contain"
                    data-ai-hint="ios add to homescreen"
                />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    