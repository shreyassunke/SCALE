export type TrackStatus = 'enter' | 'soon'

export type Track = {
  id: string
  index: string
  title: string
  status: TrackStatus
  href?: string
  /** Optional one-line description shown in the command palette */
  blurb?: string
  /** 0-based index for hero highlight coupling */
  track: number
}

/**
 * Single source of truth for the landing catalog.
 * Add a track by appending one object — rail + palette pick it up automatically.
 */
export const tracks: Track[] = [
  {
    id: 'cosmic-scale',
    index: '01',
    title: 'Cosmic Scale',
    status: 'enter',
    href: '/cosmic',
    track: 0,
    blurb: 'Smallest to largest objects in the known universe.',
  },
  {
    id: 'consciousness',
    index: '02',
    title: 'Levels of Consciousness',
    status: 'soon',
    track: 1,
    blurb: 'Layers of awareness from the cellular to the collective.',
  },
  {
    id: 'civilizations',
    index: '03',
    title: 'Levels of Civilizations',
    status: 'soon',
    track: 2,
    blurb: 'Energy and reach — planetary to galactic orders of magnitude.',
  },
  {
    id: 'time',
    index: '04',
    title: 'Deep Time',
    status: 'soon',
    track: 3,
    blurb: 'From Planck ticks to the heat death of the universe.',
  },
  {
    id: 'energy',
    index: '05',
    title: 'Orders of Energy',
    status: 'soon',
    track: 4,
    blurb: 'Watts to supernovae — magnitude as a felt sense.',
  },
  {
    id: 'information',
    index: '06',
    title: 'Information Density',
    status: 'soon',
    track: 5,
    blurb: 'Bits, brains, libraries, and the observable cosmos.',
  },
  {
    id: 'life',
    index: '07',
    title: 'Scales of Life',
    status: 'soon',
    track: 6,
    blurb: 'Molecule to microbiome to megafauna.',
  },
  {
    id: 'sound',
    index: '08',
    title: 'Spectrum of Sound',
    status: 'soon',
    track: 7,
    blurb: 'Infrasound through ultrasound across living worlds.',
  },
  {
    id: 'light',
    index: '09',
    title: 'Electromagnetic Spectrum',
    status: 'soon',
    track: 8,
    blurb: 'Radio hush to gamma flash — what we can and cannot see.',
  },
  {
    id: 'population',
    index: '10',
    title: 'Human Numbers',
    status: 'soon',
    track: 9,
    blurb: 'Villages, cities, nations, and the planet as a crowd.',
  },
  {
    id: 'complexity',
    index: '11',
    title: 'Layers of Complexity',
    status: 'soon',
    track: 10,
    blurb: 'Particles to societies — emergence along the way.',
  },
]

/** @deprecated Prefer `tracks` — kept for any residual imports */
export const environments = tracks
