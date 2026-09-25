import { useCallback, useEffect, useRef, useState } from 'react'
import type { RenderCv } from '../types/rendercv'

export const DRAFT_KEY = 'rendercv.wizard.draft.v1'

export type StoredDraft = {
  model: RenderCv
  raw: string
}

export type SaveState = 'idle' | 'saving' | 'saved'

const DEBOUNCE_MS = 500

/**
 * Local autosave for the form draft (`{ model, raw }` JSON under
 * `rendercv.wizard.draft.v1`), debounced, PWA-friendly (no network) and
 * defensive in environments without working localStorage (private mode,
 * some jsdom setups) — storage failures are swallowed, never thrown.
 */
export function useDraft() {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const persist = useCallback(
    (draft: StoredDraft) => {
      clearTimer()
      setSaveState('saving')
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
          setSavedAt(new Date())
          setSaveState('saved')
        } catch {
          // Storage unavailable (private mode / jsdom) — editing still works.
          setSavedAt(null)
          setSaveState('idle')
        }
        timerRef.current = null
      }, DEBOUNCE_MS)
    },
    [clearTimer],
  )

  const restore = useCallback((): StoredDraft | null => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY)
      if (stored === null) {
        return null
      }
      const parsed = JSON.parse(stored) as Partial<StoredDraft>
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        parsed.model !== null &&
        typeof parsed.model === 'object'
      ) {
        return {
          model: parsed.model as RenderCv,
          raw: typeof parsed.raw === 'string' ? parsed.raw : '',
        }
      }
      return null
    } catch {
      return null
    }
  }, [])

  const clear = useCallback(() => {
    clearTimer()
    setSaveState('idle')
    setSavedAt(null)
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
  }, [clearTimer])

  return { persist, restore, clear, saveState, savedAt }
}