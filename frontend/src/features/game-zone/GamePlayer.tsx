/**
 * Full-screen host for a game module. Owns the session lifecycle:
 * checkpoints (throttled), completion → server validation → result screen,
 * and abandon on exit.
 */
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useMotionConfig } from '@/lib/useReducedMotion'
import { ApiError } from '@/lib/api/client'
import { playApi } from '@/lib/api/endpoints'
import type { GameDetail, GameSession, SessionResult } from '@/lib/api/types'
import { useInvalidateProgress } from '@/lib/queries'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import { PageLoader } from '@/components/ui/Feedback'
import type { GameModuleDefinition, GameResult } from '@/games/types'
import { ResultScreen } from './ResultScreen'
import styles from './GamePlayer.module.css'

const CHECKPOINT_INTERVAL_MS = 3000

class GameErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function GamePlayer({
  game,
  module,
  session,
  resumeState,
  onClose,
}: {
  game: GameDetail
  module: GameModuleDefinition
  session: GameSession
  resumeState: Record<string, unknown>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const user = useUser()
  const { setUser } = useAuth()
  const invalidate = useInvalidateProgress()
  const reducedMotion = useMotionConfig()
  const [phase, setPhase] = useState<'playing' | 'submitting' | 'result' | 'rejected'>('playing')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [rejection, setRejection] = useState('')
  const lastCheckpoint = useRef(0)
  const GameComponent = useMemo(() => lazy(module.load), [module])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const onCheckpoint = useCallback(
    (progress: number, state: Record<string, unknown>) => {
      const now = Date.now()
      if (now - lastCheckpoint.current < CHECKPOINT_INTERVAL_MS) return
      lastCheckpoint.current = now
      void playApi.checkpoint(session.id, Math.round(progress), state).catch(() => undefined)
    },
    [session.id],
  )

  const onComplete = useCallback(
    async (r: GameResult) => {
      setPhase('submitting')
      try {
        const res = await playApi.complete(session.id, r)
        setResult(res)
        setUser({ ...user, stats: res.stats })
        setPhase('result')
      } catch (err) {
        setRejection(err instanceof ApiError ? err.message : t('errors.generic'))
        setPhase('rejected')
      } finally {
        void invalidate()
      }
    },
    [session.id, setUser, user, invalidate, t],
  )

  const onExit = useCallback(() => {
    if (phase === 'playing' && !window.confirm(t('game.exitConfirm'))) return
    if (phase === 'playing') void playApi.abandon(session.id).catch(() => undefined)
    void invalidate()
    onClose()
  }, [phase, session.id, onClose, invalidate, t])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={game.title}>
      <header className={styles.bar}>
        <span className={styles.title}>{game.title}</span>
        <button type="button" className={styles.exit} onClick={onExit} aria-label={t('game.exit')}>
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.stage}>
        {phase === 'playing' && (
          <GameErrorBoundary fallback={<p className={styles.error}>{t('errors.boundaryBody')}</p>}>
            <Suspense fallback={<PageLoader label={t('game.loadingGame')} />}>
              <GameComponent
                game={game}
                resumeState={resumeState}
                settings={user.settings}
                reducedMotion={reducedMotion}
                onCheckpoint={onCheckpoint}
                onComplete={onComplete}
                onExit={onExit}
              />
            </Suspense>
          </GameErrorBoundary>
        )}
        {phase === 'submitting' && <PageLoader label={t('game.submitting')} />}
        {(phase === 'result' || phase === 'rejected') && (
          <ResultScreen game={game} result={result} rejection={phase === 'rejected' ? rejection : undefined} onClose={onClose} />
        )}
      </div>
    </div>
  )
}
