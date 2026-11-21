import { useReducedMotion } from 'framer-motion'

/** True when animations should be minimised (learner setting or device preference). */
export function useMotionConfig(): boolean {
  return useReducedMotion() ?? document.documentElement.dataset.motion === 'reduced'
}
