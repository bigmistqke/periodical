import { createContext, useContext } from 'solid-js'
import { SetStoreFunction } from 'solid-js/store'

export const themes = ['light', 'dark'] as const

export interface Entry {
  date: Date
}

export interface Store {
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

export const StoreContext = createContext<{
  store: Store
  setStore: SetStoreFunction<Store>
}>()

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('StoreContext is undefined')
  }
  return context
}
