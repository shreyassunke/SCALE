export type SectionKey = 'intro' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'coda'

export type CopyBeat = {
  id: string
  section: SectionKey
  /** Peak visibility within section progress (0–1) */
  at: number
  span?: number
  title?: string
  body: string
  aside?: string
  /** Shown as a small badge — use for non-literal / metaphorical frames */
  tag?: string
}

/**
 * Copy distilled from the dimensional journey framing in
 * https://www.youtube.com/watch?v=-gPFxMHWV8w
 * Keep each beat under ~25 words on screen.
 */
export const copyBeats: CopyBeat[] = [
  {
    id: 'intro-1',
    section: 'intro',
    at: 0.15,
    span: 0.55,
    title: 'All 7 Dimensions',
    body: 'A dimension is an independent direction — a degree of freedom that places an object in space.',
    aside: 'Descartes · coordinate system',
  },
  {
    id: 'intro-2',
    section: 'intro',
    at: 0.7,
    span: 0.4,
    body: 'Higher up, dimensions become metaphors for levels of reality we cannot see directly.',
    tag: 'Note',
  },
  {
    id: '0-1',
    section: '0',
    at: 0.2,
    span: 0.36,
    title: '0D — The Point',
    body: 'Zero directions to move. Force a body here and no shape remains — only a coordinate.',
  },
  {
    id: '0-2',
    section: '0',
    at: 0.52,
    span: 0.34,
    body: 'A mathematical point with no size. No space to travel. The idea of moving loses meaning.',
  },
  {
    id: '0-3',
    section: '0',
    at: 0.82,
    span: 0.3,
    body: 'Absolute claustrophobia. You seem to exist — yet to the rest of the universe, you don’t.',
  },
  {
    id: '1-1',
    section: '1',
    // Peaks as the enter-morph finishes (~0.2) so title and line arrive together
    at: 0.2,
    span: 0.34,
    title: '1D — The Line',
    body: 'One degree of freedom. You become an infinitely thin line — forward or back. That’s it.',
  },
  {
    id: '1-2',
    section: '1',
    at: 0.5,
    span: 0.34,
    body: 'You can’t turn. You can’t step aside. Up and sideways simply do not exist here.',
  },
  {
    id: '1-3',
    section: '1',
    at: 0.8,
    span: 0.3,
    body: 'Meet an obstacle ahead and you are stuck forever. On a line, a block is the end of the universe.',
  },
  {
    id: '2-1',
    section: '2',
    at: 0.2,
    span: 0.32,
    title: '2D — The Plane',
    body: 'Stretch the line at a right angle. Length and width. Your world is a drawing on paper.',
  },
  {
    id: '2-2',
    section: '2',
    at: 0.45,
    span: 0.3,
    body: 'A creature usually sees one dimension lower — as projections and cross-sections.',
    aside: 'Flatland · Edwin A. Abbott, 1884',
  },
  {
    id: '2-3',
    section: '2',
    at: 0.68,
    span: 0.28,
    body: 'A coin on the table, eye at the surface: no circle — only a flat horizontal line.',
  },
  {
    id: '2-4',
    section: '2',
    at: 0.88,
    span: 0.24,
    body: 'Flat walls hide you from neighbors. From above, your fortress is an open box.',
  },
  {
    id: '3-1',
    section: '3',
    at: 0.18,
    span: 0.28,
    title: '3D — Grasp',
    body: 'The plane thickens into a box. Depth arrives — a solid you can hold.',
  },
  {
    id: '3-2',
    section: '3',
    at: 0.42,
    span: 0.28,
    body: 'A hand reaches in. Fingers close. Volume is proven by the grasp itself.',
  },
  {
    id: '3-3',
    section: '3',
    at: 0.68,
    span: 0.28,
    body: 'You lift what Flatland could only see as a square. Inside the box stays hidden.',
  },
  {
    id: '3-4',
    section: '3',
    at: 0.9,
    span: 0.22,
    body: 'How would you notice a fourth direction if you only live inside this moment?',
  },
  {
    id: '4-1',
    section: '4',
    at: 0.18,
    span: 0.3,
    title: '4D — The Editor',
    body: 'Pull back. The pickup is now a clip on a timeline — every frame visible at once.',
    aside: 'Like a video editor',
  },
  {
    id: '4-2',
    section: '4',
    at: 0.42,
    span: 0.28,
    body: 'Scrub forward and back. Reach, grasp, lift — the whole gesture is one object.',
  },
  {
    id: '4-3',
    section: '4',
    at: 0.68,
    span: 0.28,
    body: 'A 4D view is the editor’s seat: not stuck in “now,” but reading the strip.',
  },
  {
    id: '4-4',
    section: '4',
    at: 0.88,
    span: 0.24,
    body: 'Your life as footage. Birth to death laid out — not a story, a sequence.',
  },
  {
    id: '5-1',
    section: '5',
    at: 0.18,
    span: 0.3,
    title: '5D — Alternate Takes',
    body: 'Same editing bay. New tracks: lift, leave, drop, never arrive.',
    tag: 'Metaphor',
  },
  {
    id: '5-2',
    section: '5',
    at: 0.48,
    span: 0.32,
    body: 'Every cut of that moment under the same laws — different outcomes of one choice.',
    tag: 'Metaphor',
  },
  {
    id: '5-3',
    section: '5',
    at: 0.8,
    span: 0.28,
    body: 'To a 5D view, those takes are not separate worlds — only different directions.',
    tag: 'Metaphor',
  },
  {
    id: '6-1',
    section: '6',
    at: 0.18,
    span: 0.3,
    title: '6D — Other Laws',
    body: 'Leave the editor. Same man, same box — gravity flips, mass softens, palms fail.',
    tag: 'Metaphor',
  },
  {
    id: '6-2',
    section: '6',
    at: 0.48,
    span: 0.32,
    body: 'Not new takes. New constants. Chemistry that never bonds. Anatomy loses meaning.',
    tag: 'Metaphor',
  },
  {
    id: '6-3',
    section: '6',
    at: 0.8,
    span: 0.28,
    body: 'Nothing left of a body — only the relation between agent and object under alien rules.',
    tag: 'Metaphor',
  },
  {
    id: '7-1',
    section: '7',
    at: 0.18,
    span: 0.3,
    title: '7D — The Catalog',
    body: 'Collapse every physics into a shelf. Every logical relation between hand and box.',
    tag: 'Metaphor',
  },
  {
    id: '7-2',
    section: '7',
    at: 0.48,
    span: 0.32,
    body: 'Not a process — a frozen map. Nothing is created. Nothing disappears. Everything already is.',
    tag: 'Metaphor',
  },
  {
    id: '7-3',
    section: '7',
    at: 0.8,
    span: 0.28,
    body: 'A library of every grasp that could be written — and every law by which it could fail.',
    tag: 'Metaphor',
  },
  {
    id: 'coda-1',
    section: 'coda',
    at: 0.28,
    span: 0.36,
    title: 'Back to three',
    body: 'One man. One box. Time only forward. The editor bay is gone.',
  },
  {
    id: 'coda-2',
    section: 'coda',
    at: 0.7,
    span: 0.36,
    body: 'We live in a narrow geometric incubator. Enjoy this 3D grasp while it lasts.',
  },
]

export const dimensionLabels: Record<SectionKey, string> = {
  intro: 'Intro',
  '0': '0D',
  '1': '1D',
  '2': '2D',
  '3': '3D',
  '4': '4D',
  '5': '5D',
  '6': '6D',
  '7': '7D',
  coda: '3D',
}
