import CorvuCalendar from '@corvu/calendar'
import clsx from 'clsx'
import { createMemo, createSignal, Index, onMount, Show } from 'solid-js'
import styles from './Calendar.module.css'
import { useCirkel } from './CirkelStoreContext'
import global from './Global.module.css'
import { dayOfOvulation, dayOfPeriod, isSameDay, isSameDayOrBefore } from './utils'

const { format: formatWeekdayLong } = new Intl.DateTimeFormat('en', {
  weekday: 'long',
})
const { format: formatWeekdayShort } = new Intl.DateTimeFormat('en', {
  weekday: 'short',
})
const { format: formatMonth } = new Intl.DateTimeFormat('en', {
  month: 'long',
})

function getDayOfTheWeek(date: Date) {
  const day = date.getDay() - 1
  if (day < 0) {
    return 6
  }
  return day
}

export function Calendar() {
  const { store } = useCirkel()

  const [amountOfMonths, setAmountOfMonths] = createSignal(6)
  const map = new WeakMap<Element, { setIsVisible(visible: boolean): void; index: number }>()

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const { setIsVisible, index } = map.get(entry.target)!
      if (entry.isIntersecting && index >= amountOfMonths() - 2) {
        setIsVisible(entry.isIntersecting)
        setAmountOfMonths(amountOfMonths => amountOfMonths + 2)
      }
    })
  })

  return (
    <div class={styles.calendarContainer}>
      <CorvuCalendar
        mode="single"
        initialValue={store.currentDate}
        numberOfMonths={amountOfMonths()}
      >
        {props => (
          <Index each={props.months}>
            {(monthProps, index) => {
              const [isVisible, setIsVisible] = createSignal(true)
              const isFromThisMonth = (day: Date) =>
                day.getMonth() === monthProps().month.getMonth()

              const firstDayOfTheMonth = () =>
                monthProps().weeks[0].find(day => isFromThisMonth(day))!

              return (
                <div
                  class={styles.calendar}
                  ref={element => {
                    onMount(() => {
                      map.set(element, { setIsVisible, index })
                      observer.observe(element)
                    })
                  }}
                >
                  <Show when={isVisible()}>
                    <header>
                      <CorvuCalendar.Label class={global.title}>
                        {formatMonth(monthProps().month)} {monthProps().month.getFullYear()}
                      </CorvuCalendar.Label>
                    </header>
                    <CorvuCalendar.Table>
                      <thead>
                        <tr>
                          <Index each={props.weekdays}>
                            {(weekday, index) => (
                              <Show
                                when={getDayOfTheWeek(firstDayOfTheMonth()) <= index}
                                fallback={<th />}
                              >
                                <CorvuCalendar.HeadCell abbr={formatWeekdayLong(weekday())}>
                                  {formatWeekdayShort(weekday()).toLowerCase()}
                                </CorvuCalendar.HeadCell>
                              </Show>
                            )}
                          </Index>
                        </tr>
                      </thead>
                      <tbody>
                        <Index each={monthProps().weeks}>
                          {(week, index) => (
                            <tr>
                              <Index each={week()}>
                                {day => {
                                  const periodDay = createMemo(() =>
                                    dayOfPeriod(store, new Date(day().getTime())),
                                  )
                                  const ovulationDay = createMemo(() =>
                                    dayOfOvulation(store, new Date(day().getTime())),
                                  )

                                  return (
                                    <Show
                                      when={isFromThisMonth(day())}
                                      fallback={
                                        <Show
                                          when={index === 0}
                                          fallback={<span class={styles.cell} />}
                                        >
                                          <CorvuCalendar.HeadCell abbr={formatWeekdayLong(day())}>
                                            {formatWeekdayShort(day()).toLowerCase()}
                                          </CorvuCalendar.HeadCell>
                                        </Show>
                                      }
                                    >
                                      <CorvuCalendar.Cell
                                        style={{
                                          '--day-of-month': day().getDate(),
                                        }}
                                        data-phase={
                                          periodDay() !== -1
                                            ? 'period'
                                            : ovulationDay() !== -1
                                            ? 'ovulation'
                                            : undefined
                                        }
                                        data-day={day().getDate()}
                                        data-start={
                                          periodDay() === 0 || ovulationDay() === 0 || undefined
                                        }
                                        data-end={
                                          periodDay() === store.settings.cycle.periodDuration - 1 ||
                                          ovulationDay() ===
                                            store.settings.cycle.ovulationDuration - 1 ||
                                          undefined
                                        }
                                        class={clsx(
                                          isSameDay(day(), store.currentDate)
                                            ? styles.today
                                            : isSameDayOrBefore(day(), store.currentDate)
                                            ? styles.past
                                            : undefined,
                                        )}
                                      >
                                        <div class={styles.cell}>
                                          <Show when={periodDay() !== -1 || ovulationDay() !== -1}>
                                            <div class={styles.indicator} />
                                          </Show>
                                        </div>
                                      </CorvuCalendar.Cell>
                                    </Show>
                                  )
                                }}
                              </Index>
                            </tr>
                          )}
                        </Index>
                      </tbody>
                    </CorvuCalendar.Table>
                  </Show>
                </div>
              )
            }}
          </Index>
        )}
      </CorvuCalendar>
    </div>
  )
}
