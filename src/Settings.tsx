import { For } from 'solid-js'
import styles from './Settings.module.css'
import { useStore } from './StoreContext'
import theme from './Theme.module.css'

export function Settings() {
  const { store, setStore } = useStore()
  return (
    <div class={styles.settings}>
      <header>
        <h2 class={theme.title}>Settings</h2>
      </header>
      <div class={styles.options}>
        <For each={Object.keys(store.settings) as Array<keyof typeof store.settings>}>
          {key => (
            <>
              <label for={key}>{key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}</label>
              <input
                type="number"
                id={key}
                value={store.settings[key]}
                onInput={event => setStore('settings', key, +event.currentTarget.value)}
              />
            </>
          )}
        </For>
      </div>
    </div>
  )
}
