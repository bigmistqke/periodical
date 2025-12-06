import { CycleStartModal } from './CycleStart'
import { MenuModal } from './Menu'
import { createModals } from './Modal'

export const modals = createModals({
  menu: MenuModal,
  cycleStart: CycleStartModal,
})
