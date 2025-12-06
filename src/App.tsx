import { makePersisted } from '@solid-primitives/storage'
import { Route, Router } from '@solidjs/router'
import clsx from 'clsx'
import { createStore } from 'solid-js/store'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { CirkelStore, CirkeStoreContext, SerializedCirkelStore } from './CirkelStoreContext'
import { Home } from './Home'
import { modals } from './modals/modals'
import { Navigation } from './Navigation'
import theme from './Theme.module.css'
import { addDays, normalizeDate } from './utils'

export default function () {
  const [store, setStore] = makePersisted(
    createStore<CirkelStore>({
      settings: {
        cycle: {
          cycleDuration: 25,
          periodDuration: 5,
          ovulationDuration: 4,
        },
        app: {
          theme: 'light',
        },
      },
      entries: [{ date: addDays(normalizeDate(new Date()), -5) }],
      currentDate: normalizeDate(new Date()),
    }),
    {
      storage: localStorage,
      name: 'cirkel',
      deserialize(json: string) {
        const data = JSON.parse(json) as SerializedCirkelStore
        return {
          ...data,
          entries: data.entries.map(entry => ({ ...entry, date: new Date(entry.date) })),
          currentDate: normalizeDate(new Date()),
        }
      },
    },
  )

  return (
    <div class={clsx(styles.page, theme[store.settings.app.theme])}>
      <CirkeStoreContext.Provider value={{ store, setStore }}>
        <modals.menu.Modal />
        <modals.cycleStart.Modal />
        <Router
          url={import.meta.env.VITE_BASE_URL}
          base={import.meta.env.VITE_BASE_URL}
          root={props => (
            <>
              {props.children}
              <Navigation menu={modals.menu.modal()!} />
            </>
          )}
        >
          <Route path="" component={Home} />
          <Route path="/calendar" component={Calendar} />
        </Router>
      </CirkeStoreContext.Provider>
    </div>
  )
}
