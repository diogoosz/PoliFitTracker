
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
        <div className="mt-4 space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-4">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        1
                    </div>
                    <p className="text-sm font-medium">Toque no ícone de <strong>Compartilhar</strong> na barra de ferramentas.</p>
                </div>
                 <div className="relative mt-2 w-full overflow-hidden rounded-lg border aspect-[16/5]">
                    <Image
                        src="https://firebasestorage.googleapis.com/v0/b/studio-4662689289-857d9.appspot.com/o/assets%2Fios-step-1.png?alt=media&amp;token=d165c71b-3f7f-4423-866a-1e43e2e8b28a"
                        alt="Passo 1: Ícone de compartilhar no Safari"
                        fill
                        className="object-contain"
                        data-ai-hint="ios share button"
                    />
                </div>
            </div>

             <div className="space-y-2">
                <div className="flex items-center gap-4">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        2
                    </div>
                    <p className="text-sm font-medium">Deslize e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>
                 <div className="relative mt-2 w-full overflow-hidden rounded-lg border aspect-[16/7]">
                     <Image
                        src="https://firebasestorage.googleapis.com/v0/b/studio-4662689289-857d9.appspot.com/o/assets%2Fios-step-2.png?alt=media&amp;token=df4f494a-9311-477c-87d4-e69e0f6c2430"
                        alt="Passo 2: Opção Adicionar à Tela de Início"
                        fill
                        className="object-contain"
                        data-ai-hint="ios add to homescreen"
                    />
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
