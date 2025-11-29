import CorvuCalendar from '@corvu/calendar'
import { AiOutlineArrowLeft, AiOutlineArrowRight } from 'solid-icons/ai'
import { createEffect, createSignal, Index } from 'solid-js'
import styles from './Calendar.module.css'

const { format: formatWeekdayLong } = new Intl.DateTimeFormat('en', {
  weekday: 'long',
})
const { format: formatWeekdayShort } = new Intl.DateTimeFormat('en', {
  weekday: 'short',
})
const { format: formatMonth } = new Intl.DateTimeFormat('en', {
  month: 'long',
})

export function Calendar() {
  const [focusedDay, setFocusedDay] = createSignal<Date>()
  const [value, setValue] = createSignal<Date>(new Date())

  createEffect(() => console.log('focusedDay', focusedDay(), value()))

  return (
    <div style={{ display: 'grid', 'grid-template-rows': '1fr 1fr', height: '100vh' }}>
      <CorvuCalendar
        mode="single"
        onFocusedDayChange={setFocusedDay}
        onValueChange={setValue}
        initialValue={new Date()}
        required
      >
        {props => (
          <div class={styles.calendar}>
            <header>
              <CorvuCalendar.Nav action="prev-month" aria-label="Go to previous month">
                <AiOutlineArrowLeft size={16} />
              </CorvuCalendar.Nav>
              <CorvuCalendar.Label>
                {formatMonth(props.month)} {props.month.getFullYear()}
              </CorvuCalendar.Label>
              <CorvuCalendar.Nav action="next-month" aria-label="Go to next month">
                <AiOutlineArrowRight size={16} />
              </CorvuCalendar.Nav>
            </header>
            <CorvuCalendar.Table>
              <thead>
                <tr>
                  <Index each={props.weekdays}>
                    {weekday => (
                      <CorvuCalendar.HeadCell abbr={formatWeekdayLong(weekday())}>
                        {formatWeekdayShort(weekday())}
                      </CorvuCalendar.HeadCell>
                    )}
                  </Index>
                </tr>
              </thead>
              <tbody>
                <Index each={props.weeks}>
                  {week => (
                    <tr>
                      <Index each={week()}>
                        {day => (
                          <CorvuCalendar.Cell>
                            <CorvuCalendar.CellTrigger day={day()}>
                              {day().getDate()}
                            </CorvuCalendar.CellTrigger>
                          </CorvuCalendar.Cell>
                        )}
                      </Index>
                    </tr>
                  )}
                </Index>
              </tbody>
            </CorvuCalendar.Table>
          </div>
        )}
      </CorvuCalendar>

      <section class={styles.log}>
        <h4>{value()?.toDateString()}</h4>
        <textarea></textarea>
      </section>
    </div>
  )
}
