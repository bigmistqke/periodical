import CorvuCalendar from '@corvu/calendar'
import { AiOutlineArrowLeft, AiOutlineArrowRight } from 'solid-icons/ai'
import { createSignal, Index } from 'solid-js'
import styles from './Calendar.module.css'
import { Settings } from './Settings'
import theme from './Theme.module.css'

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

  return (
    <div class={styles.calendarContainer}>
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
              <CorvuCalendar.Label class={theme.title}>
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
      <Settings />

      {/* <section class={styles.log}>
        <h4>{value()?.toDateString()}</h4>
        <div class={styles.textareaContainer}>
          <TextareaAutosize
            minRows={16}
            class="textarea"
            value={`This is a note.
and this is a new line of that note.`}
          />
        </div>
      </section> */}
    </div>
  )
}
