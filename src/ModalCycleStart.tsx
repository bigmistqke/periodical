import { mergeRefs } from '@solid-primitives/refs'
import { createSignal } from 'solid-js'
import { produce } from 'solid-js/store'
import { Modal, ModalProps } from './components/Modal'
import styles from './ModalCycleStart.module.css'
import { useStore } from './StoreContext'
import { addDays, formatRelativeDay, normalizeDate } from './utils'

export function CycleStartModal(props: Omit<ModalProps, 'children'>) {
  const { store, setStore } = useStore()
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
            confirm
          </Modal.Button>
        </div>
      }
    >
      <Modal.Section title="Start Day of Cycle">
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
