import { A } from '@solidjs/router'
import { VsMenu } from 'solid-icons/vs'
import styles from './Navigation.module.css'

export function Navigation(props: { menu: HTMLDialogElement }) {
  return (
    <div class={styles['navigation-container']}>
      <nav>
        <div>
          <A href="/" activeClass={styles.active} end>
            home
          </A>
        </div>
        <div>
          <A href="/calendar" activeClass={styles.active}>
            calendar
          </A>
        </div>
        <button class={styles.menu} onClick={() => props.menu.show()}>
          <span>menu</span>
          <VsMenu />
        </button>
      </nav>
    </div>
  )
}
