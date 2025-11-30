import { Route, Router } from '@solidjs/router'
import { createStore } from 'solid-js/store'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { Home } from './Home'
import { Settings } from './Settings'
import { StoreContext } from './StoreContext'

export default function () {
  const [store, setStore] = createStore({
    settings: {
      amountOfCycleDays: 25,
      amountOfMenstruationDays: 5,
    },
  })

  return (
    <div class={styles.page}>
      <StoreContext.Provider value={store}>
        <Router>
          <Route path="/calendar" component={Calendar} />
          <Route path="/" component={Home} />
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
