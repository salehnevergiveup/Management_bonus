"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmText?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmButtonColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirm",
  showConfirmButton = true,
  showCancelButton = true,
  confirmButtonColor = "default",
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <div className="text-sm text-muted-foreground">{children}</div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          {showCancelButton && (
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </AlertDialogCancel>
          )}
          {showConfirmButton && (
            <AlertDialogAction asChild>
              <Button variant={confirmButtonColor} onClick={onConfirm}>
                {confirmText}
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
