import { X } from "lucide-react"
import {
  createContext,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
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

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
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
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const open = context?.open ?? false

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = "hidden"
    contentRef.current?.focus()

    return () => {
      document.body.style.overflow = ""
      previousFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && context && !disabled) {
        context.onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [context, disabled, open])

  if (!context || !open) {
    return null
  }

  const handleBackdropClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.target === event.currentTarget && !disabled) {
      context.onOpenChange(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
        disabled={disabled}
        aria-label={closeLabel}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-lg rounded-3xl border bg-white p-6 shadow-2xl outline-none",
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
      </div>
    </div>
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
