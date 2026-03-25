/**
 * Builds SVG cubic-bezier path strings for the journey track.
 *
 * @param {Array}  nodes      - array of { x, y }
 * @param {number} activeIdx  - index of the currently active node (-1 = none)
 * @param {'vertical'|'horizontal'} direction
 * @returns {{ pathD: string, litD: string }}
 */
export default function buildJourneyPath(nodes, activeIdx, direction = 'vertical') {
  if (!nodes.length) return { pathD: '', litD: '' };

  const start = `M ${nodes[0].x} ${nodes[0].y}`;
  let pathD = start;
  let litD  = activeIdx >= 0 ? start : '';

  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i - 1];
    const c = nodes[i];

    // Control point midpoint differs by direction
    const seg = direction === 'vertical'
      ? ` C ${p.x} ${(p.y + c.y) / 2}, ${c.x} ${(p.y + c.y) / 2}, ${c.x} ${c.y}`
      : ` C ${(p.x + c.x) / 2} ${p.y}, ${(p.x + c.x) / 2} ${c.y}, ${c.x} ${c.y}`;

    pathD += seg;
    if (activeIdx >= 0 && i <= activeIdx) litD += seg;
  }

  return { pathD, litD };
}
