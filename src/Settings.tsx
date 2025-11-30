import { For } from 'solid-js'
import styles from './Settings.module.css'
import { useStore } from './StoreContext'
import theme from './Theme.module.css'

export function Settings() {
  const store = useStore()
  return (
    <div class={styles.settings}>
      <header>
        <h2 class={theme.title}>Settings</h2>
      </header>
      <div class={styles.options}>
        <For each={Object.keys(store.settings) as Array<keyof typeof store.settings>}>
          {key => (
            <>
              <label for={key}>{key}</label>
              <input id={key} value={store.settings[key]} />
            </>
          )}
        </For>
      </div>
    </div>
  )
}
