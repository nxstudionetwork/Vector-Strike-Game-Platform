/**
 * Game module registry.
 *
 * Each playable game registers here with a lazy import, so its code is only
 * downloaded when a learner opens it. Example (added in a later phase):
 *
 *   register({ key: 'bridge-builder', load: () => import('./bridge-builder') })
 *
 * The key must match `Game.module_key` in the backend catalog. A catalog game
 * whose module is not registered is shown, but cannot be launched.
 */
import type { GameModuleDefinition } from './types'

const modules = new Map<string, GameModuleDefinition>()

export function register(definition: GameModuleDefinition) {
  modules.set(definition.key, definition)
}

export function getGameModule(key: string): GameModuleDefinition | undefined {
  return modules.get(key)
}

export function registeredModuleKeys(): string[] {
  return [...modules.keys()]
}

// Phase 1 ships the platform only — game modules are registered in later phases.
