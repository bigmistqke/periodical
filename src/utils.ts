import { CirkelStore } from './CirkelStoreContext'
import { DAY, HOUR } from './constants'

// From https://github.com/corvudev/corvu/blob/ff79bca96ead89a703637c0738191e20e1ffa67d/packages/calendar/src/utils.ts

export const isSameDay = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false
  if (a.getDate() !== b.getDate()) return false
  if (a.getMonth() !== b.getMonth()) return false
  if (a.getFullYear() !== b.getFullYear()) return false
  return true
}

export const isSameDayOrBefore = (a: Date | null, b: Date | null) => {
  if (!a || !b) return false
  if (isSameDay(a, b)) return true
  if (a.getTime() < b.getTime()) return true
  return false
}

export function normalizeDate(date: Date) {
  return new Date(Math.ceil(date.getTime() / DAY) * DAY)
}

export function addHour(date: Date) {
  return new Date(date.getTime() + HOUR)
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY)
}

export function getDayOfTheCycle(store: CirkelStore, date: Date) {
  let last = store.entries[store.entries.length - 1].date
  let lastTime = last.getTime()
  const normalizedDate = normalizeDate(date).getTime()

  if (last.getTime() > normalizedDate) {
    lastTime -=
      Math.floor((lastTime - normalizedDate) / store.settings.cycle.cycleDuration) *
      store.settings.cycle.cycleDuration *
      DAY
  }

  const dayOfTheCycle = ((normalizedDate - lastTime) / DAY) % store.settings.cycle.cycleDuration

  return dayOfTheCycle
}

export function getDaysUntilCycleCompletes(store: CirkelStore, date: Date) {
  return store.settings.cycle.cycleDuration - getDayOfTheCycle(store, date)
}

export function isDayInPeriod(store: CirkelStore, date: Date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date)

  return dayOfTheCycle > 0 && dayOfTheCycle < store.settings.cycle.periodDuration
}

export function dayOfPeriod(store: CirkelStore, date: Date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date)

  if (dayOfTheCycle > store.settings.cycle.periodDuration - 1) {
    return -1
  }

  return dayOfTheCycle
}

export function isDayInOvulation(store: CirkelStore, date: Date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date)
  const center = Math.floor(store.settings.cycle.cycleDuration / 2)
  return dayOfTheCycle < center && dayOfTheCycle > center - 4
}

export function dayOfOvulation(store: CirkelStore, date: Date) {
  const dayOfTheCycle = getDayOfTheCycle(store, date)
  const center = Math.floor(store.settings.cycle.cycleDuration / 2)

  const startOfOvulation = center - store.settings.cycle.ovulationDuration
  const dayOfOvulation = dayOfTheCycle - startOfOvulation

  if (dayOfOvulation < 0) {
    return -1
  }

  if (dayOfOvulation >= store.settings.cycle.ovulationDuration) {
    return -1
  }
  return dayOfOvulation
}

const ordinalRules = new Intl.PluralRules('en-US')
const cardinalRules = new Intl.PluralRules('en-US', { type: 'cardinal' })
const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })

export function formatRelativeDay(value: number) {
  return rtf.format(value, 'day')
}

export function postfixOrdinal(value: number) {
  // select() can return any of four tags for ordinal numbers in English, representing each of the allowed forms:
  // - one for "st" numbers (1, 21, 31, ...)
  // - two for "nd" numbers (2, 22, 32, ...)
  // - few for "rd" numbers (3, 33, 43, ...)
  // - and other for "th" numbers (0, 4-20, etc.).
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
  switch (ordinalRules.select(value)) {
    case 'one':
      return `${value}st`
    case 'two':
      return `${value}nd`
    case 'few':
      return `${value}rd`
    case 'other':
      return `${value}th`
  }
}

export function postfixCardinal(value: number, cardinal: string) {
  // As English only has two forms for cardinal numbers,
  // the select() method returns only two tags:
  // - "one" for the singular case, and
  // - "other" for all other cardinal numbers.
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
  switch (cardinalRules.select(value)) {
    case 'one':
      return cardinal
    case 'other':
      return `${cardinal}s`
  }
}
