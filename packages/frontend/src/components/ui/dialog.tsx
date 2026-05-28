import { X } from "lucide-react"
import {
  createContext,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

type DialogContentProps = Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "closedby" | "onCancel" | "onClose" | "open"
> & {
  disabled?: boolean
  showCloseButton?: boolean
  closeLabel?: string
}

export function DialogContent({
  className,
  children,
  disabled = false,
  showCloseButton = false,
  closeLabel = "閉じる",
  ...props
}: DialogContentProps) {
  const context = useContext(DialogContext)
  const contentRef = useRef<HTMLDialogElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(false)
  const disabledRef = useRef(disabled)
  const onOpenChangeRef = useRef<((open: boolean) => void) | null>(null)
  const suppressCloseSyncRef = useRef(false)
  const open = context?.open ?? false
  openRef.current = open
  disabledRef.current = disabled
  onOpenChangeRef.current = context?.onOpenChange ?? null

  const restorePreviousFocus = useCallback(() => {
    const previousFocus = previousFocusRef.current
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    const dialog = contentRef.current
    if (!dialog) {
      return
    }

    if (!open) {
      if (dialog.open) {
        suppressCloseSyncRef.current = true
        dialog.close()
      }
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (!dialog.open) {
      dialog.showModal()
    }

    return () => {
      if (dialog.open) {
        suppressCloseSyncRef.current = true
        dialog.close()
      }
      document.body.style.overflow = previousOverflow
      restorePreviousFocus()
    }
  }, [open, restorePreviousFocus])

  useEffect(() => {
    const dialog = contentRef.current
    if (!dialog) {
      return
    }

    const handleCancel = (event: Event) => {
      if (disabledRef.current) {
        event.preventDefault()
        return
      }
      onOpenChangeRef.current?.(false)
    }

    const handleClose = () => {
      const shouldSyncClose = !suppressCloseSyncRef.current
      suppressCloseSyncRef.current = false

      if (shouldSyncClose && openRef.current) {
        onOpenChangeRef.current?.(false)
      }

      restorePreviousFocus()
    }

    dialog.addEventListener("cancel", handleCancel)
    dialog.addEventListener("close", handleClose)
    return () => {
      dialog.removeEventListener("cancel", handleCancel)
      dialog.removeEventListener("close", handleClose)
    }
  }, [restorePreviousFocus])

  useEffect(() => {
    const dialog = contentRef.current
    if (!dialog) {
      return
    }

    const handleBackdropClick = (event: MouseEvent) => {
      const supportsClosedBy = "closedBy" in HTMLDialogElement.prototype
      const rect = dialog.getBoundingClientRect()
      const clickedBackdrop =
        event.target === dialog &&
        (event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom)

      if (!supportsClosedBy && clickedBackdrop && !disabledRef.current) {
        onOpenChangeRef.current?.(false)
      }
    }

    dialog.addEventListener("click", handleBackdropClick)
    return () => dialog.removeEventListener("click", handleBackdropClick)
  }, [])

  if (!context) {
    return null
  }

  return (
    <dialog
      ref={contentRef}
      closedby={disabled ? "none" : "any"}
      className={cn(
        "tasche-dialog relative w-[calc(100%-2rem)] max-w-lg rounded-3xl border bg-white p-6 shadow-2xl outline-none",
        className,
      )}
      {...props}
    >
      {showCloseButton ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={() => context.onOpenChange(false)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{closeLabel}</span>
        </Button>
      ) : null}
      {children}
    </dialog>
  )
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-semibold text-emerald-950", className)} {...props} />
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}
