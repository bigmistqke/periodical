import { createMemo, createSignal, Index, Match, Switch } from 'solid-js'
import { useCirkel } from './CirkelStoreContext'
import styles from './Home.module.css'
import { modals } from './modals/modals'
import {
  dayOfOvulation,
  dayOfPeriod,
  getDayOfTheCycle,
  getDaysUntilCycleCompletes,
  postfixCardinal,
  postfixOrdinal,
} from './utils'

const [bounds, setBounds] = createSignal<DOMRect>(document.body.getBoundingClientRect())
new ResizeObserver(() => setBounds(document.body.getBoundingClientRect())).observe(document.body)

const BUTTON_SIZE = 80

export function Home() {
  const { store } = useCirkel()
  const svgHeight = createMemo(() => (bounds().height / 64) * 19)

  function toPercentageModulo(value: number) {
    return ((value / store.settings.cycle.cycleDuration) * 100) % 100
  }

  function createGradientStops(): [string, string?][] {
    const daysUntilCycleCompletes =
      store.settings.cycle.cycleDuration -
      (getDayOfTheCycle(store, store.currentDate) % store.settings.cycle.cycleDuration)
    const daysUntilOvulation = daysUntilCycleCompletes + store.settings.cycle.cycleDuration / 2
    const daysUntilEndOfPeriod = daysUntilCycleCompletes + store.settings.cycle.periodDuration

    const stops = (
      [
        ['var(--color-bg-gradient)', toPercentageModulo(daysUntilCycleCompletes - 1)],
        ['var(--color-period)', toPercentageModulo(daysUntilCycleCompletes + 1)],
        ['var(--color-period)', toPercentageModulo(daysUntilEndOfPeriod - 1)],
        ['var(--color-bg-gradient)', toPercentageModulo(daysUntilEndOfPeriod + 1)],
        ['var(--color-bg-gradient)', toPercentageModulo(daysUntilOvulation - 4)],
        ['var(--color-ovulation)', toPercentageModulo(daysUntilOvulation - 3)],
        ['var(--color-ovulation)', toPercentageModulo(daysUntilOvulation)],
        ['var(--color-bg-gradient)', toPercentageModulo(daysUntilOvulation + 1)],
      ] satisfies [string, number][]
    ).sort(([, a], [, b]) => (a - b < 0 ? -1 : 1))

    const [firstColor, firstPercentage] = stops[0]

    if (firstPercentage === 0) {
      stops.push([firstColor, 100])
    }

    return stops.map(([color, percentage]) => [color, `${percentage}%`])
  }

  function halfCirclePath(cx: number, cy: number, r: number) {
    return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,1 ' + r * 2 + ', 0'
  }

  function createGradient() {
    return `linear-gradient(to right, ${createGradientStops()
      .map(arr => arr.join(' '))
      .join(', ')})`
  }

  return (
    <div class={styles.home} style={{ '--svg-height': `${svgHeight()}px` }}>
      <div class={styles.timeline}>
        <div class={styles.ruler}>
          <Index each={Array.from({ length: store.settings.cycle.cycleDuration })}>
            {() => <div />}
          </Index>
        </div>
        <div style={{ background: createGradient() }} class={styles.gradient} />
      </div>
      <section class={styles.main}>
        <section>
          <em>{postfixOrdinal(getDayOfTheCycle(store, store.currentDate) + 1)} day</em>
          <div>of your cycle</div>
        </section>
        <section class={styles.statement}>
          <Switch
            fallback={
              <>
                <em>
                  {getDaysUntilCycleCompletes(store, store.currentDate)}{' '}
                  {postfixCardinal(getDaysUntilCycleCompletes(store, store.currentDate), 'day')}
                </em>
                <div>until your cycle is completed</div>
              </>
            }
          >
            <Match when={dayOfPeriod(store, store.currentDate) !== -1}>
              <em>
                {store.settings.cycle.periodDuration - dayOfPeriod(store, store.currentDate)}{' '}
                {postfixCardinal(
                  store.settings.cycle.periodDuration - dayOfPeriod(store, store.currentDate),
                  'day',
                )}
              </em>
              <div>until your period ends</div>
            </Match>
            <Match when={dayOfOvulation(store, store.currentDate) !== -1}>
              <em>
                {store.settings.cycle.ovulationDuration - dayOfOvulation(store, store.currentDate)}{' '}
                {postfixCardinal(
                  store.settings.cycle.ovulationDuration - dayOfOvulation(store, store.currentDate),
                  'day',
                )}
              </em>
              <div>until day of your ovulation</div>
            </Match>
          </Switch>
        </section>
      </section>
      <section>
        <div class={styles['cycle-button-container']}>
          <button
            onClick={() => modals.cycleStart.modal()?.show()}
            class={styles['cycle-button']}
          />
          <svg width={120} height={120} viewBox={`0 0 120 120`}>
            <defs>
              <path fill-rule="evenodd" id="MyPath" d={halfCirclePath(60, 60, 40)} stroke="white" />
            </defs>
            <text>
              <textPath
                class={styles['text-path']}
                href="#MyPath"
                stroke="white"
                startOffset="25px"
                textLength="90px"
              >
                a new cycle
              </textPath>
            </text>
          </svg>
        </div>
      </section>
    </div>
  )
}
