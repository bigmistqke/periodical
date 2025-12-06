import { mergeRefs } from '@solid-primitives/refs'
import clsx from 'clsx'
import { FiArrowLeft, FiArrowRight } from 'solid-icons/fi'
import {
  Accessor,
  Component,
  ComponentProps,
  createSignal,
  JSX,
  JSXElement,
  Show,
  splitProps,
} from 'solid-js'
import styles from './Modal.module.css'

export type ModalProps = Omit<ComponentProps<'dialog'>, 'onClick'> & {
  closeSlot?: JSXElement
}

export function Modal(props: ModalProps) {
  const [config, rest] = splitProps(props, ['class', 'closeSlot', 'children'])
  const modal = (
    <dialog
      class={clsx(styles.modal, config.class)}
      onClick={event => event.target === event.currentTarget && modal.close()}
      {...rest}
    >
      {config.children}
      <Show when={config.closeSlot === undefined} fallback={config.closeSlot}>
        <Modal.Button onClick={() => modal!.close('')}>close</Modal.Button>
      </Show>
    </dialog>
  ) as HTMLDialogElement
  return modal
}

const ARROW_SIZE = 36

Modal.Section = function (props: ComponentProps<'section'> & { title: string }) {
  return (
    <section class={styles.section}>
      <header>
        <h3>{props.title}</h3>
      </header>
      {props.children}
    </section>
  )
}

Modal.Button = function (props: ComponentProps<'button'>) {
  return <button {...props} class={clsx(props.class, styles.button)} />
}

Modal.BinaryOption = function (props: {
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

export function createModals<T extends Record<string, Component<ModalProps>>>(
  modals: T,
): {
  [TKey in keyof T]: {
    modal: Accessor<HTMLDialogElement | undefined>
    Modal: (props: ModalProps) => JSXElement
  }
} {
  return Object.fromEntries(
    Object.entries(modals).map(([key, Modal]) => {
      const [modal, setModal] = createSignal<HTMLDialogElement>()
      return [
        key,
        {
          modal,
          Modal: (props: ModalProps) => <Modal {...props} ref={mergeRefs(setModal, props.ref)} />,
        },
      ]
    }),
  )
}
