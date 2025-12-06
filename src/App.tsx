import { Route, Router, useBeforeLeave } from '@solidjs/router'
import clsx from 'clsx'
import { createStore } from 'solid-js/store'
import styles from './App.module.css'
import { Calendar } from './Calendar'
import { CirkelStore, CirkeStoreContext } from './CirkelStoreContext'
import { Home } from './Home'
import { modals } from './modals/modals'
import { Navigation } from './Navigation'
import theme from './Theme.module.css'
import { addDays, normalizeDate } from './utils'

export default function () {
  const [store, setStore] = createStore<CirkelStore>({
    settings: {
      cycle: {
        cycleDuration: 25,
        periodDuration: 5,
      },
      app: {
        theme: 'dark',
      },
    },
    entries: [{ date: addDays(normalizeDate(new Date()), -5) }],
    currentDate: normalizeDate(new Date()),
  })

  return (
    <div class={clsx(styles.page, theme[store.settings.app.theme])}>
      <CirkeStoreContext.Provider value={{ store, setStore }}>
        <modals.menu.Modal />
        <modals.cycleStart.Modal />
        <Router
          root={props => {
            const transition = function (fnThatChangesTheDOM: ViewTransitionUpdateCallback) {
              // In case the API is not yet supported
              if (!document.startViewTransition) {
                return fnThatChangesTheDOM()
              }

              // Transition the changes in the DOM
              const transition = document.startViewTransition(fnThatChangesTheDOM)
            }

            useBeforeLeave(e => {
              // Stop the inmediate navigation and DOM change
              e.preventDefault()

              // Perform the action that triggers a DOM change
              transition(() => {
                e.retry(true)
              })
            })
            return (
              <>
                {props.children}
                <Navigation menu={modals.menu.modal()!} />
              </>
            )
          }}
        >
          <Route path="/" component={Home} />
          <Route path="/calendar" component={Calendar} />
        </Router>
      </CirkeStoreContext.Provider>
    </div>
  )
}
