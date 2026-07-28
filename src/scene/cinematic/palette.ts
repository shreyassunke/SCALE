/**
 * Restrained film grade for chromatic journey content.
 * Warm key / cool fill — never neon cyan/pink soup.
 */
export const Cinema = {
  void: 0x000000,
  signal: 0xffffff,
  signalDim: 0x9a9a9a,
  /** Warm tungsten key for PBR reads */
  keyWarm: 0xffe8d2,
  /** Cool fill — steel / night */
  fillCool: 0xb8c8e0,
  /** Soft amber “event” / NOW accent */
  eventAmber: 0xffd7a0,
  /** Deep steel for metal filament */
  metalSteel: 0xc4cdd8,
  /** Soft paper warmth for 2D plane */
  paperWarm: 0xe8e0d4,
  /** Interior plaster */
  plaster: 0xd4d0c8,
  /** Spacetime ribbon — cool luminous, not neon */
  spacetime: 0xd0e4f5,
  spacetimeCore: 0xf2f7fc,
  /** Branch trunk / tip — cool → muted rose (not hot pink) */
  branchTrunk: 0xc8d8e8,
  branchTip: 0xe8c4c0,
  /** Other-physics field — muted teal → warm dust */
  landscapeNear: 0xb0c4d4,
  landscapeFar: 0xd4b8a8,
  /** 7D lattice */
  lattice: 0xdce4f0,
} as const

export const CinemaExposure = {
  base: 0.92,
  deep: 0.78,
  pulseAmp: 0.035,
} as const
