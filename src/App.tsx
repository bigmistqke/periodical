import { Route, Router } from '@solidjs/router'
import { createStore } from 'solid-js/store'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { Home } from './Home'
import { Settings } from './Settings'
import { Store, StoreContext } from './StoreContext'
import { DAY } from './constants'

export default function () {
  const [store, setStore] = createStore<Store>({
    settings: {
      cycleDays: 25,
      menstruationDays: 5,
    },
    entries: [{ date: new Date(new Date().getTime() - 20 * DAY), note: '', bleeding: true }],
  })

  return (
    <div class={styles.page}>
      <StoreContext.Provider value={{ store, setStore }}>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/settings" component={Settings} />
        </Router>
      </StoreContext.Provider>
      <nav class={styles.navigation}>
        <a href="/">home</a>
        <a href="/calendar">calendar</a>
        <a href="/settings">settings</a>
      </nav>
    </div>
  )
}
