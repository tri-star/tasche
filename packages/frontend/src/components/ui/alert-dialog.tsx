import type { DialogHTMLAttributes, HTMLAttributes, ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type AlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

type AlertDialogContentProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "closedby" | "onCancel" | "onClose" | "open"
> & {
  disabled?: boolean
}

export function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} />
}

export function AlertDialogContent({ className, ...props }: AlertDialogContentProps) {
  return <DialogContent className={cn("border-destructive/30", className)} {...props} />
}

export const AlertDialogHeader = DialogHeader
export const AlertDialogFooter = DialogFooter

export function AlertDialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <DialogTitle className={cn("text-foreground", className)} {...props} />
}

export const AlertDialogDescription = DialogDescription
