/**
 * The contract between the Vector Strike platform and an individual game.
 *
 * A game is a lazily-loaded React component. The platform owns sessions,
 * scoring, XP, achievements and navigation; the game owns gameplay only and
 * reports what happened through these callbacks.
 */
import type { ComponentType } from 'react'
import type { GameDetail, PlayerSettings } from '@/lib/api/types'

export interface GameResult {
  /** 0 … game.max_score. The server rejects anything outside this range. */
  score: number
  /** 0 … 1, when the game measures correctness. */
  accuracy?: number | null
  /** false when the learner finished without completing the objective. */
  completed?: boolean
  /** Learning signals for analytics/adaptivity: mistakes, hints used, moves… */
  metrics?: Record<string, unknown>
}

export interface GameModuleProps {
  game: GameDetail
  /** State saved by a previous checkpoint (Continue Playing), or {}. */
  resumeState: Record<string, unknown>
  /** Learner preferences every game must respect (sound, hints, timers, motion). */
  settings: PlayerSettings
  reducedMotion: boolean
  /** Save progress so the learner can resume later. Safe to call often (throttled). */
  onCheckpoint: (progressPercent: number, state: Record<string, unknown>) => void
  /** Finish the session. The platform validates the result and shows rewards. */
  onComplete: (result: GameResult) => void
  /** Leave without finishing. */
  onExit: () => void
}

export interface GameModuleDefinition {
  /** Must equal Game.module_key in the backend catalog. */
  key: string
  load: () => Promise<{ default: ComponentType<GameModuleProps> }>
}
