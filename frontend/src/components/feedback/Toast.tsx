/**
 * Global toast notifications. Announced to screen readers via a polite live region.
 *   const toast = useToast(); toast.success('Saved')
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Info, Trophy, X } from 'lucide-react'
import styles from './Toast.module.css'

type Tone = 'success' | 'error' | 'info' | 'achievement'

interface ToastItem {
  id: number
  tone: Tone
  message: string
  detail?: string
}

interface ToastApi {
  show: (message: string, opts?: { tone?: Tone; detail?: string; durationMs?: number }) => void
  success: (message: string, detail?: string) => void
  error: (message: string, detail?: string) => void
  info: (message: string, detail?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info, achievement: Trophy }
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    (message, opts = {}) => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-(MAX_VISIBLE - 1)), { id, message, tone: opts.tone ?? 'info', detail: opts.detail }])
      window.setTimeout(() => dismiss(id), opts.durationMs ?? 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, d) => show(m, { tone: 'success', detail: d }),
      error: (m, d) => show(m, { tone: 'error', detail: d, durationMs: 6000 }),
      info: (m, d) => show(m, { tone: 'info', detail: d }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const ToneIcon = ICONS[item.tone]
          return (
            <div key={item.id} className={`${styles.toast} ${styles[item.tone]}`}>
              <ToneIcon size={20} aria-hidden="true" className={styles.icon} />
              <div className={styles.text}>
                <strong>{item.message}</strong>
                {item.detail && <span>{item.detail}</span>}
              </div>
              <button type="button" className={styles.close} onClick={() => dismiss(item.id)} aria-label={t('toast.dismiss')}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
