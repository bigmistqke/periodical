import { produce } from 'solid-js/store'
import { themes, useCirkel } from '../CirkelStoreContext'
import { DAY } from '../constants'
import { getDayOfTheCycle, postfixOrdinal } from '../utils'
import { Modal, ModalProps } from './Modal'

export function MenuModal(props: Omit<ModalProps, 'children'>) {
  const { store, setStore } = useCirkel()
  return (
    <Modal {...props}>
      <Modal.Section title="Cycle Settings">
        <Modal.BinaryOption
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
        <Modal.BinaryOption
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
        <Modal.BinaryOption
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
      </Modal.Section>
      <Modal.Section title="App Settings">
        <Modal.BinaryOption
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
      </Modal.Section>
    </Modal>
  )
}
