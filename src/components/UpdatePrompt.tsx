import { useEffect, useRef } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'

interface UpdatePromptProps {
  isOpen: boolean
  isApplying: boolean
  title?: string
  description?: string
  body?: string
  actionLabel?: string
  pendingLabel?: string
  dismissLabel?: string
  canDismiss?: boolean
  onUpdate: () => void
  onDismiss: () => void
}

export const UpdatePrompt = ({
  isOpen,
  isApplying,
  title = 'Update ready',
  description = 'A new CAREFARM POS update has been downloaded.',
  body = 'Apply it now to restart the app with the latest version, or continue working and update later.',
  actionLabel = 'Update now',
  pendingLabel = 'Updating...',
  dismissLabel = 'Later',
  canDismiss = true,
  onUpdate,
  onDismiss,
}: UpdatePromptProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        modalRef.current?.focus()
      })
    }
    return () => {
      document.body.style.overflow = 'unset'
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss && !isApplying) {
        onDismiss()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, canDismiss, isApplying, onDismiss])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="update-prompt-title">
      <div ref={modalRef} tabIndex={-1} className="w-full max-w-md rounded-xl border border-gray-700 bg-primary-dark shadow-2xl shadow-black/40 outline-none">
        <div className="flex items-start justify-between border-b border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 id="update-prompt-title" className="text-lg font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isApplying || !canDismiss}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Dismiss update"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-gray-300">
            {body}
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {canDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                disabled={isApplying}
                className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dismissLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onUpdate}
              disabled={isApplying}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-green px-4 py-2.5 text-sm font-bold text-primary-dark transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isApplying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isApplying ? pendingLabel : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
