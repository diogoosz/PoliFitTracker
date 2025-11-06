"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
            <div className="flex items-center gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    1
                </div>
                <p className="text-sm font-medium">Toque no ícone de <strong>Compartilhar</strong> na barra de ferramentas do Safari.</p>
            </div>
             <div className="flex items-center gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    2
                </div>
                <p className="text-sm font-medium">Deslize e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
