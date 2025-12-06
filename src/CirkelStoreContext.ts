import { createContext, useContext } from 'solid-js'
import { SetStoreFunction } from 'solid-js/store'
import themeStyles from './Theme.module.css'

export const themes = Object.keys(themeStyles)

export interface Entry {
  date: Date
}

export interface SerializedEntry {
  date: number
}

export interface CirkelStore {
  settings: {
    cycle: {
      cycleDuration: number
      periodDuration: number
      ovulationDuration: number
    }
    app: {
      theme: (typeof themes)[number]
    }
  }
  currentDate: Date
  entries: Array<Entry>
}

export interface SerializedCirkelStore {
  settings: {
    cycle: {
      cycleDuration: number
      periodDuration: number
      ovulationDuration: number
    }
    app: {
      theme: (typeof themes)[number]
    }
  }
  currentDate: number
  entries: Array<SerializedEntry>
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
