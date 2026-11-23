import { useEffect, type RefObject } from 'react'

/**
 * Closes a popover when the user clicks/taps outside it or presses Escape.
 * `ignore` refs (e.g. the trigger button) don't count as "outside".
 */
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  container: RefObject<HTMLElement | null>,
  ignore: RefObject<HTMLElement | null>[] = [],
) {
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (container.current?.contains(target)) return
      if (ignore.some((r) => r.current?.contains(target))) return
      onDismiss()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onDismiss, container, ignore])
}
