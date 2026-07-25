import type { Group } from 'three'
import type { PerfSettings } from '../../utils/perf'

/**
 * Each dimension module lives in one continuous scene graph.
 * `dimension` is a continuous float held per section so commentary and
 * visuals stay locked (e.g. section 1 eases 0.16→1 then holds ≤1.62).
 */
export type DimensionContext = {
  dimension: number
  sectionProgress: number
  globalProgress: number
  time: number
  perf: PerfSettings
  section?: string
}

export type DimensionModule = {
  readonly name: string
  readonly group: Group
  /** Called once when the module should enter the scene */
  mount: () => void
  /** Drive visuals from the shared dimension float */
  update: (ctx: DimensionContext) => void
  /** Release GPU resources when scrolled far past */
  dispose: () => void
  readonly mounted: boolean
}
