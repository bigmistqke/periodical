import { createModals } from './components/Modal'
import { CycleStartModal } from './ModalCycleStart'
import { MenuModal } from './ModalMenu'

export const modals = createModals({
  menu: MenuModal,
  cycleStart: CycleStartModal,
})
