import { useRef, useState, useEffect } from 'react';

/**
 * Tracks the angle the paper plane should face based on
 * which week node it's travelling from → to.
 *
 * @param {number} activeWeekNum  - currently selected week
 * @param {Array}  nodes          - array of { week, x, y }
 * @param {number} defaultAngle   - initial angle in degrees (90 = down, 0 = right)
 */
export default function usePlaneAngle(activeWeekNum, nodes, defaultAngle = 90) {
  const prevRef = useRef(activeWeekNum);
  const [angle, setAngle] = useState(defaultAngle);

  useEffect(() => {
    const prevIdx = nodes.findIndex(n => n.week === prevRef.current);
    const currIdx = nodes.findIndex(n => n.week === activeWeekNum);

    if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
      const from = nodes[prevIdx];
      const to   = nodes[currIdx];
      const rad  = Math.atan2(to.y - from.y, to.x - from.x);
      setAngle(rad * (180 / Math.PI));
    }

    prevRef.current = activeWeekNum;
  }, [activeWeekNum]);

  return angle;
}
