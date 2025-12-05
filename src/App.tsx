import { Route, Router } from '@solidjs/router'
import clsx from 'clsx'
import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { Home } from './Home'
import { Menu } from './Menu'
import { Navigation } from './Navigation'
import { Settings } from './Settings'
import { Store, StoreContext } from './StoreContext'
import theme from './Theme.module.css'
import { normalizeDate } from './utils'

export default function () {
  const [store, setStore] = createStore<Store>({
    settings: {
      cycle: {
        cycleDuration: 25,
        periodDuration: 5,
      },
      app: {
        theme: 'dark',
      },
    },
    entries: [{ date: normalizeDate(new Date()) }],
    currentDate: normalizeDate(new Date()),
  })

  const [menu, setMenu] = createSignal<HTMLDialogElement | undefined>(undefined)

  // let menu: HTMLDialogElement = null!

  return (
    <div class={clsx(styles.page, theme[store.settings.app.theme])}>
      <StoreContext.Provider value={{ store, setStore }}>
        <Menu ref={setMenu} />
        <Router
          root={props => (
            <>
              {props.children}
              <Navigation menu={menu()!} />
            </>
          )}
        >
          <Route path="/" component={Home} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/settings" component={Settings} />
        </Router>
      </StoreContext.Provider>
    </div>
  )
}
