import { createContext, useContext } from 'solid-js'
import { SetStoreFunction } from 'solid-js/store'

export const themes = ['light', 'dark'] as const

export interface Entry {
  date: Date
}

export interface CirkelStore {
  settings: {
    cycle: {
      cycleDuration: number
      periodDuration: number
    }
    app: {
      theme: (typeof themes)[number]
    }
  }
  currentDate: Date
  entries: Array<Entry>
}

export const CirkeStoreContext = createContext<{
  store: CirkelStore
  setStore: SetStoreFunction<CirkelStore>
}>()

export function useCirkel() {
  const context = useContext(CirkeStoreContext)
  if (!context) {
    throw new Error('StoreContext is undefined')
  }
  return context
}
