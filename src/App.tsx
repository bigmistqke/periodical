import { Route, Router } from '@solidjs/router'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { Home } from './Home'

export default function () {
  return (
    <div class={styles.page}>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/calendar" component={Calendar} />
      </Router>
      <nav class={styles.navigation}>
        <a href="/">home</a>
        <a href="/calendar">calendar</a>
      </nav>
    </div>
  )
}
