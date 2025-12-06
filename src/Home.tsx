import { createMemo, createSignal } from 'solid-js'
import { useCirkel } from './CirkelStoreContext'
import styles from './Home.module.css'
import { modals } from './modals/modals'
import {
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

  function circlePath(cx: number, cy: number, r: number) {
    return (
      'M ' +
      cx +
      ' ' +
      cy +
      ' m -' +
      r +
      ', 0 a ' +
      r +
      ',' +
      r +
      ' 0 1,1 ' +
      r * 2 +
      ',0 a ' +
      r +
      ',' +
      r +
      ' 0 1,1 -' +
      r * 2 +
      ',0'
    )
  }

  function createGradient() {
    return `linear-gradient(to right, ${createGradientStops()
      .map(arr => arr.join(' '))
      .join(', ')})`
  }

  return (
    <div class={styles.overview} style={{ '--svg-height': `${svgHeight()}px` }}>
      <div style={{ background: createGradient() }} class={styles.gradient} />
      <section class={styles.main}>
        <section>
          <em>{postfixOrdinal(getDayOfTheCycle(store, store.currentDate) + 1)} day</em>
          <div>of your cycle</div>
        </section>
        <section>
          <em>
            {getDaysUntilCycleCompletes(store, store.currentDate)}{' '}
            {postfixCardinal(getDaysUntilCycleCompletes(store, store.currentDate), 'day')}
          </em>
          <div>until your cycle is completed</div>
        </section>
      </section>
      <section>
        <button class={styles['cycle-button']} onClick={() => modals.cycleStart.modal()?.show()} />
        <svg
          width={bounds().width}
          height={svgHeight() + BUTTON_SIZE}
          viewBox={`0 -${BUTTON_SIZE / 2} ${bounds().width} ${svgHeight()}`}
        >
          <defs>
            <path
              fill-rule="evenodd"
              id="MyPath"
              d={circlePath(bounds().width / 2, 0, (4 * BUTTON_SIZE) / 5)}
              stroke="white"
            />
          </defs>

          <text>
            <textPath
              class={styles['text-path']}
              href="#MyPath"
              stroke="white"
              method="stretch"
              startOffset={20}
              spacing="auto"
              letter-spacing={10}
              font-size-adjust={20}
            >
              a new cycle
            </textPath>
          </text>
          <line
            x1={0}
            x2={bounds().width}
            y1={0}
            y2={0}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={0}
            y1={0}
            y2={svgHeight() / 4}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={0}
            y1={0}
            y2={svgHeight() / 2}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={0}
            y1={0}
            y2={(3 * svgHeight()) / 4}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={0}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={0}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width / 4}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width / 2}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={(3 * bounds().width) / 4}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width}
            y1={0}
            y2={svgHeight()}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width}
            y1={0}
            y2={svgHeight() / 4}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width}
            y1={0}
            y2={svgHeight() / 2}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
          <line
            x1={bounds().width / 2}
            x2={bounds().width}
            y1={0}
            y2={(3 * svgHeight()) / 4}
            stroke="var(--color-border)"
            stroke-width="1px"
          />
        </svg>
      </section>
    </div>
  )
}
