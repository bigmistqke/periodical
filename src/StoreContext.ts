import { createContext, useContext } from 'solid-js'
import { SetStoreFunction } from 'solid-js/store'

export interface Entry {
  date: Date
  note: string
  bleeding: boolean
}

export interface Store {
  settings: {
    cycleDays: number
    periodDays: number
  }
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
