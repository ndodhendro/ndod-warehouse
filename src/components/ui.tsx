import { useCallback, useContext, useEffect, useState, createContext, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, LoaderCircle, X, type LucideIcon } from "lucide-react"
import { pesanError } from "../lib/errors"

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

const buttonStyles = {
  primary: "bg-amber-500 text-ink-950 hover:bg-amber-400",
  ghost: "border border-white/10 bg-white/5 text-mist-100 hover:bg-white/10",
  danger: "bg-clay-400/15 text-clay-400 hover:bg-clay-400/25",
  quiet: "text-mist-300 hover:bg-white/5",
}

export function buttonClass(variant: keyof typeof buttonStyles = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    buttonStyles[variant],
    className,
  )
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button className={buttonClass(variant, className)} {...props}>
      {children}
    </button>
  )
}

export function LinkButton({
  to,
  variant = "primary",
  className,
  children,
}: {
  to: string
  variant?: keyof typeof buttonStyles
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, className)}>
      {children}
    </Link>
  )
}

export function FormActions({
  onCancel,
  cancelLabel = "Batal",
  submitLabel,
  pendingLabel = "Menyimpan...",
  pending = false,
  submitType = "submit",
  onSubmit,
  cancelClassName,
}: {
  onCancel: () => void
  cancelLabel?: string
  submitLabel: string
  pendingLabel?: string
  pending?: boolean
  submitType?: "submit" | "button"
  onSubmit?: () => void
  cancelClassName?: string
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="ghost" className={cn("min-w-0 flex-1", cancelClassName)} disabled={pending} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type={submitType} className="min-w-0 flex-1 whitespace-normal px-3 text-center leading-tight" disabled={pending} onClick={onSubmit}>
        <span className="min-w-0">{pending ? pendingLabel : submitLabel}</span>
      </Button>
    </div>
  )
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  back,
  action,
  icon: Icon,
}: {
  kicker?: string
  title: string
  subtitle?: ReactNode
  back?: string
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm text-mist-300">
            <ArrowLeft size={16} />
            Kembali
          </Link>
        )}
        {kicker && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">{kicker}</p>}
        <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {Icon && <Icon size={22} className="shrink-0 text-amber-300" aria-hidden />}
          <span className="truncate">{title}</span>
        </h1>
        {subtitle && <p className="mt-1 text-sm text-mist-300">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Stat({ label, value, hint, extra }: { label: string; value: string; hint?: string; extra?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 shadow-card">
      <p className="text-xs text-mist-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-mist-500">{hint}</p>}
      {extra && <p className="text-xs text-mist-300">{extra}</p>}
    </div>
  )
}

const badgeTones = {
  neutral: "bg-white/5 text-mist-300",
  tas: "bg-amber-500/15 text-amber-300",
  botol: "bg-teal-500/15 text-teal-300",
  kotak: "bg-lilac-400/15 text-lilac-300",
  ok: "bg-teal-500/15 text-teal-300",
  warn: "bg-clay-400/15 text-clay-400",
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", badgeTones[tone])}>{children}</span>
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-white/10 bg-ink-800/80 shadow-card", className)}>{children}</div>
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mist-300">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-mist-500">{hint}</span>}
    </label>
  )
}

const tinggiLayar = "min-h-[calc(100dvh-var(--tinggi-nav-bawah)-3.5rem)] md:min-h-[calc(100dvh-5rem)]"

export const kelasAreaMuat = `flex flex-col ${tinggiLayar}`

export function Loading({
  label = "Memuat...",
  letak = "layar",
}: {
  label?: string
  letak?: "layar" | "baris"
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center gap-2 text-sm text-mist-300",
        letak === "layar" && tinggiLayar,
        letak === "baris" && "py-6",
      )}
    >
      <LoaderCircle className="animate-spin" size={18} />
      {label}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-2xl border border-clay-400/30 bg-clay-400/10 px-4 py-3 text-sm text-clay-400">{pesanError(error)}</div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-mist-300">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const adaIsi = value.length > 0
  return (
    <div className="relative">
      <input
        className={cn("field", adaIsi && "pr-11")}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        inputMode="search"
        enterKeyHint="search"
      />
      {adaIsi && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-mist-400 hover:text-mist-100"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[88dvh] w-full max-w-lg overflow-auto rounded-t-3xl border border-white/10 bg-ink-900 p-5 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type ConfirmOptions = {
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const tutup = (nilai: boolean) => {
    state?.resolve(nilai)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-4 sm:place-items-center">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-card" role="alertdialog" aria-modal="true">
            <h2 className="text-lg font-semibold">{state.title}</h2>
            <p className="mt-2 text-sm text-mist-300">{state.body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => tutup(false)}>
                Batal
              </Button>
              <Button variant={state.danger ? "danger" : "primary"} onClick={() => tutup(true)}>
                {state.confirmLabel ?? "Lanjut"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

type ToastTone = "ok" | "err"

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: ToastTone }>>([])

  const push = useCallback((message: string, tone: ToastTone = "ok") => {
    const id = Date.now() + Math.random()
    setToasts((items) => [...items, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 3400)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 bottom-[calc(var(--tinggi-nav-bawah)+4.75rem)] md:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto max-w-sm rounded-full px-4 py-2 text-sm font-medium shadow-card",
              toast.tone === "err" ? "bg-clay-400 text-ink-950" : "bg-mist-100 text-ink-950",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
