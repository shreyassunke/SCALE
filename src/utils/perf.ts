export type PerfTier = 'high' | 'low'

export type PerfSettings = {
  tier: PerfTier
  particleCount: number
  dustCount: number
  pixelRatio: number
  enableSoftGlow: boolean
}

function isMobileUserAgent(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/**
 * Lightweight load-time fidelity check — no WebGL benchmarks required.
 * Caps DPR at 2; dials particles down on mobile / low cores / low memory.
 */
export function detectPerf(): PerfSettings {
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const mobile = isMobileUserAgent()
  const low =
    mobile ||
    cores <= 4 ||
    (typeof memory === 'number' && memory <= 4)

  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  if (low) {
    return {
      tier: 'low',
      // Slightly higher floor — post-3D worms/trees need enough samples to read
      particleCount: 100,
      dustCount: 120,
      pixelRatio: Math.min(dpr, 1.5),
      enableSoftGlow: false,
    }
  }

  return {
    tier: 'high',
    particleCount: 260,
    dustCount: 400,
    pixelRatio: dpr,
    enableSoftGlow: true,
  }
}
