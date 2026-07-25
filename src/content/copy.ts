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
    at: 0.2,
    span: 0.32,
    title: '3D — Our Space',
    body: 'Pull the plane upward. Depth arrives. This is the geometric incubator we live in.',
  },
  {
    id: '3-2',
    section: '3',
    at: 0.45,
    span: 0.3,
    body: 'Your retina gets a flat image. The brain invents depth from disparity, perspective, shadows.',
    aside: 'Ehrenfest · why three spatial dims fit physics',
  },
  {
    id: '3-3',
    section: '3',
    at: 0.7,
    span: 0.3,
    body: 'You see outer shells only. A locked safe. The back of a monitor. Inside stays hidden.',
  },
  {
    id: '3-4',
    section: '3',
    at: 0.9,
    span: 0.22,
    body: 'How would you notice a fourth direction if you are built to perceive only three?',
  },
  {
    id: '4-1',
    section: '4',
    at: 0.2,
    span: 0.32,
    title: '4D — Spacetime',
    body: 'Add a coordinate independent of x, y, z. In physics, that role is often played by time.',
    aside: 'Minkowski · 1908',
  },
  {
    id: '4-2',
    section: '4',
    at: 0.45,
    span: 0.3,
    body: 'Like a video timeline: the viewer sees frames; the editor sees the whole strip at once.',
  },
  {
    id: '4-3',
    section: '4',
    at: 0.68,
    span: 0.28,
    body: 'A 4D view of us is like our view of Flatland — every moment visible together.',
  },
  {
    id: '4-4',
    section: '4',
    at: 0.88,
    span: 0.24,
    body: 'Your life becomes a spacetime worm: birth to death as one frozen object — not a story.',
  },
  {
    id: '5-1',
    section: '5',
    at: 0.2,
    span: 0.32,
    title: '5D — Possibility',
    body: 'After time: alternative outcomes. Each choice splits the worm into another branch.',
    tag: 'Metaphor',
    aside: 'Everett · many-worlds',
  },
  {
    id: '5-2',
    section: '5',
    at: 0.5,
    span: 0.34,
    body: 'You become a branching fractal — a forest of every person you could have been.',
    tag: 'Metaphor',
  },
  {
    id: '5-3',
    section: '5',
    at: 0.8,
    span: 0.3,
    body: 'To a 5D view, those lives are not separate worlds — only different directions.',
    tag: 'Metaphor',
  },
  {
    id: '6-1',
    section: '6',
    at: 0.2,
    span: 0.32,
    title: '6D — Other Physics',
    body: 'Not new destinies under the same laws — entire landscapes of different constants.',
    tag: 'Metaphor',
    aside: 'String-theory landscape · illustrative',
  },
  {
    id: '6-2',
    section: '6',
    at: 0.5,
    span: 0.34,
    body: 'Stronger gravity. Different light. Chemistry that never bonds. Anatomy loses meaning.',
    tag: 'Metaphor',
  },
  {
    id: '6-3',
    section: '6',
    at: 0.8,
    span: 0.3,
    body: 'Nothing left of a body — only information linking “you” across possible law-sets.',
    tag: 'Metaphor',
  },
  {
    id: '7-1',
    section: '7',
    at: 0.2,
    span: 0.32,
    title: '7D — All Logic Allows',
    body: 'Collapse every physics-landscape to a point. What remains is every logically possible reality.',
    tag: 'Metaphor',
  },
  {
    id: '7-2',
    section: '7',
    at: 0.5,
    span: 0.34,
    body: 'Not a process — a frozen map. Nothing is created. Nothing disappears. Everything already is.',
    tag: 'Metaphor',
  },
  {
    id: '7-3',
    section: '7',
    at: 0.8,
    span: 0.3,
    body: 'A library of every alphabet, language, story — and every law by which stories could be written.',
    tag: 'Metaphor',
  },
  {
    id: 'coda-1',
    section: 'coda',
    at: 0.28,
    span: 0.36,
    title: 'Back to three',
    body: 'Walls solid again. Time only forward. Behind you and inside the safe stay mysteries.',
  },
  {
    id: 'coda-2',
    section: 'coda',
    at: 0.7,
    span: 0.36,
    body: 'We live in a narrow, balanced geometric incubator. Enjoy this 3D illusion while it lasts.',
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
