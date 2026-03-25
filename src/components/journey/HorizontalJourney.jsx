import PaperPlane from './PaperPlane';
import JourneyNode from './JourneyNode';
import buildJourneyPath from './buildJourneyPath';
import usePlaneAngle from '../../hooks/usePlaneAngle';

const PAD_L     = 32;
const PAD_R     = 32;
const NODE_STEP = 90;
const SVG_H     = 90;
const CY        = 32;

/**
 * Horizontal journey track — rendered as a scrollable top strip on mobile.
 */
export default function HorizontalJourney({ weeks, activeWeekNum, onSelectWeek }) {
  if (!weeks.length) return null;

  const SVG_W = PAD_L + (weeks.length - 1) * NODE_STEP + PAD_R;

  // Slight up/down wobble for game-path feel
  const nodes = weeks.map((w, i) => ({
    x: PAD_L + i * NODE_STEP,
    y: i % 2 === 0 ? CY : CY + 12,
    week: w.week,
    label: w.label,
  }));

  const activeIdx = nodes.findIndex(n => n.week === activeWeekNum);
  const traveler  = activeIdx >= 0 ? nodes[activeIdx] : nodes[0];
  const angle     = usePlaneAngle(activeWeekNum, nodes, 0); // default: pointing right
  const { pathD, litD } = buildJourneyPath(nodes, activeIdx, 'horizontal');

  return (
    <div className="hj-scroll-wrap">
      <svg
        width={SVG_W} height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* dim full path */}
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />

        {/* lit path */}
        {litD && (
          <path d={litD} fill="none" stroke="rgba(99,102,241,0.65)"
            strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        )}

        {nodes.map((n, i) => (
          <g key={n.week}>
            <JourneyNode
              node={n}
              isActive={n.week === activeWeekNum}
              isPast={activeIdx >= 0 && i <= activeIdx}
              activeRadius={14}
              inactiveRadius={10}
              onSelect={onSelectWeek}
            />
            {/* week label below node */}
            <text
              x={n.x} y={n.y + (n.week === activeWeekNum ? 28 : 24)}
              textAnchor="middle"
              fill={n.week === activeWeekNum ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'}
              fontSize="8" fontFamily="Inter,sans-serif"
              style={{ transition: 'fill 0.3s' }}
            >
              {n.label}
            </text>
          </g>
        ))}

        <PaperPlane x={traveler.x} y={traveler.y - 20} angleDeg={angle} />
      </svg>
    </div>
  );
}
