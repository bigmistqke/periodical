import { mergeRefs } from '@solid-primitives/refs'
import { FiArrowLeft, FiArrowRight } from 'solid-icons/fi'
import { JSX, Ref } from 'solid-js'
import { produce } from 'solid-js/store'
import { DAY } from './constants'
import styles from './Menu.module.css'
import { themes, useStore } from './StoreContext'
import { getDayOfTheCycle, postfixOrdinal } from './utils'

export function Menu(props: { ref: Ref<HTMLDialogElement> }) {
  const { store, setStore } = useStore()

  let menu: HTMLDialogElement = null!

  return (
    <dialog
      ref={mergeRefs(element => (menu = element), props.ref)}
      class={styles.menu}
      onClick={element => element.target === element.currentTarget && menu.close()}
    >
      <section class={styles.section}>
        <header>
          <h3>Cycle Settings</h3>
        </header>
        <BinaryOption
          disabled={store.settings.cycle.cycleDuration === 1 ? 'left' : undefined}
          onLeftClick={() => setStore(produce(store => store.settings.cycle.cycleDuration--))}
          onRightClick={() => setStore(produce(store => store.settings.cycle.cycleDuration++))}
          title={
            <div>
              <div>cycle duraton</div>
              <div>{store.settings.cycle.cycleDuration} days</div>
            </div>
          }
        />
        <BinaryOption
          disabled={store.settings.cycle.periodDuration === 1 ? 'left' : undefined}
          onLeftClick={() => setStore(produce(store => store.settings.cycle.periodDuration--))}
          onRightClick={() => setStore(produce(store => store.settings.cycle.periodDuration++))}
          title={
            <div>
              <div>period duraton</div>
              <div>{store.settings.cycle.periodDuration} days</div>
            </div>
          }
        />
        <BinaryOption
          disabled={getDayOfTheCycle(store, store.currentDate) === 0 ? 'left' : undefined}
          onLeftClick={() =>
            setStore(
              produce(store => {
                const entry = store.entries[store.entries.length - 1]
                entry.date = new Date(entry.date.getTime() + DAY)
              }),
            )
          }
          onRightClick={() =>
            setStore(
              produce(store => {
                const entry = store.entries[store.entries.length - 1]
                entry.date = new Date(entry.date.getTime() - DAY)
              }),
            )
          }
          title={
            <div>
              <div>{postfixOrdinal(getDayOfTheCycle(store, store.currentDate) + 1)} day</div>
              <div>of your cycle</div>
            </div>
          }
        />
      </section>
      <section>
        <header>
          <h3>App Settings</h3>
        </header>
        <BinaryOption
          onLeftClick={() =>
            setStore(
              produce(store => {
                const index =
                  (store.settings.app.theme.indexOf(store.settings.app.theme) - 1) % themes.length
                store.settings.app.theme = themes[index]
              }),
            )
          }
          onRightClick={() =>
            setStore(
              produce(store => {
                let index = store.settings.app.theme.indexOf(store.settings.app.theme) - 1
                if (index < 0) {
                  index = themes.length - 1
                }
                store.settings.app.theme = themes[index]
              }),
            )
          }
          title={<>{store.settings.app.theme} theme</>}
        />
      </section>
      <button onClick={() => menu!.close('')}>close</button>
    </dialog>
  )
}

const ARROW_SIZE = 36

function BinaryOption(props: {
  title: JSX.Element
  onLeftClick(): void
  onRightClick(): void
  disabled?: 'left' | 'right' | boolean
}) {
  return (
    <div class={styles['binary-option']}>
      <div class={styles['label-container']}>
        <div class={styles.icon}>
          <FiArrowLeft size={ARROW_SIZE} />
        </div>
        <div class={styles.label}>{props.title}</div>
        <div class={styles.icon}>
          <FiArrowRight size={ARROW_SIZE} />
        </div>
      </div>
      <div class={styles['button-container']}>
        <button
          disabled={props.disabled === 'left' || props.disabled === true}
          onClick={props.onLeftClick}
        />
        <button
          disabled={props.disabled === 'right' || props.disabled === true}
          onClick={props.onRightClick}
        />
      </div>
    </div>
  )
}
