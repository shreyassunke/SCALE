export type EnvironmentStatus = 'live' | 'soon'

export type Environment = {
  id: string
  label: string
  status: EnvironmentStatus
  href?: string
  /** Track index for scene highlight (0-based) */
  track: number
  blurb: string
}

export const environments: Environment[] = [
  {
    id: 'dimensions',
    label: '7 Dimensions',
    status: 'live',
    href: '/dimensions',
    track: 0,
    blurb: '0D through 7D — a continuous scroll through degrees of freedom.',
  },
  {
    id: 'cosmic',
    label: 'Cosmic Scale',
    status: 'soon',
    track: 1,
    blurb: 'Smallest to largest objects in the known universe.',
  },
  {
    id: 'consciousness',
    label: 'Levels of Consciousness',
    status: 'soon',
    track: 2,
    blurb: 'Layers of awareness from the cellular to the collective.',
  },
  {
    id: 'civilizations',
    label: 'Levels of Civilizations',
    status: 'soon',
    track: 3,
    blurb: 'Energy and reach — planetary to galactic orders of magnitude.',
  },
]
