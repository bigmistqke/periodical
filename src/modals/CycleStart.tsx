import { mergeRefs } from '@solid-primitives/refs'
import { createSignal } from 'solid-js'
import { produce } from 'solid-js/store'
import { useCirkel } from '../CirkelStoreContext'
import { addDays, formatRelativeDay, normalizeDate } from '../utils'
import styles from './CycleStart.module.css'
import { Modal, ModalProps } from './Modal'

export function CycleStartModal(props: Omit<ModalProps, 'children'>) {
  const { store, setStore } = useCirkel()
  const [day, setDay] = createSignal(0)
  const [modal, setModal] = createSignal<HTMLDialogElement>()
  return (
    <Modal
      {...props}
      ref={mergeRefs(setModal, props.ref)}
      onClose={() => setDay(0)}
      closeSlot={
        <div class={styles.buttons}>
          <Modal.Button onClick={() => modal()?.close()}>cancel</Modal.Button>
          <Modal.Button
            onClick={() => {
              setStore(
                'entries',
                produce(entries =>
                  entries.push({
                    date: addDays(normalizeDate(new Date()), day()),
                  }),
                ),
              )
              modal()?.close()
            }}
          >
            start cycle
          </Modal.Button>
        </div>
      }
    >
      <Modal.Section title="Your period started">
        <Modal.BinaryOption
          // disabled={store.settings.cycle.cycleDuration === 1 ? 'left' : undefined}
          onLeftClick={() => setDay(day => day - 1)}
          onRightClick={() => setDay(day => day + 1)}
          title={
            <div>
              <div>{formatRelativeDay(day())}</div>
            </div>
          }
        />
      </Modal.Section>
    </Modal>
  )
}
