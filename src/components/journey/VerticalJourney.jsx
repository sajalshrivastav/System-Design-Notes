import PaperPlane from './PaperPlane';
import JourneyNode from './JourneyNode';
import buildJourneyPath from './buildJourneyPath';
import usePlaneAngle from '../../hooks/usePlaneAngle';

const PAD_TOP    = 40;
const PAD_BOTTOM = 40;
const SVG_W      = 56;
const CX         = SVG_W / 2;

/**
 * Vertical journey track — rendered in the left column on desktop.
 * Fills the full height of the right (lesson table) column via containerHeight.
 */
export default function VerticalJourney({ weeks, activeWeekNum, onSelectWeek, containerHeight }) {
  if (!weeks.length) return null;

  const usable = Math.max(containerHeight - PAD_TOP - PAD_BOTTOM, weeks.length * 60);
  const gap    = weeks.length > 1 ? usable / (weeks.length - 1) : usable;
  const SVG_H  = usable + PAD_TOP + PAD_BOTTOM;

  // Slight left/right wobble for game-path feel
  const nodes = weeks.map((w, i) => ({
    x: i % 2 === 0 ? CX - 6 : CX + 6,
    y: PAD_TOP + i * gap,
    week: w.week,
    label: w.label,
  }));

  const activeIdx = nodes.findIndex(n => n.week === activeWeekNum);
  const traveler  = activeIdx >= 0 ? nodes[activeIdx] : nodes[0];
  const angle     = usePlaneAngle(activeWeekNum, nodes, 90);
  const { pathD, litD } = buildJourneyPath(nodes, activeIdx, 'vertical');

  return (
    <div className="vj-wrap">
      <svg
        width={SVG_W} height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="vj-svg"
        style={{ overflow: 'visible' }}
      >
        {/* dim full path */}
        <path d={pathD} fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />

        {/* lit path up to active node */}
        {litD && (
          <path d={litD} fill="none" stroke="rgba(99,102,241,0.65)"
            strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        )}

        {nodes.map((n, i) => (
          <JourneyNode
            key={n.week}
            node={n}
            isActive={n.week === activeWeekNum}
            isPast={activeIdx >= 0 && i <= activeIdx}
            onSelect={onSelectWeek}
          />
        ))}

        <PaperPlane x={traveler.x} y={traveler.y - 22} angleDeg={angle} />
      </svg>

      {/* Week labels pinned to each node's Y */}
      <div className="vj-labels" style={{ height: SVG_H, position: 'relative' }}>
        {nodes.map(n => (
          <button
            key={n.week}
            className={`vj-label ${n.week === activeWeekNum ? 'active' : ''}`}
            style={{ top: n.y - 14 }}
            onClick={() => onSelectWeek(n.week)}
          >
            <span className="vj-wnum">Week {n.week}</span>
            <span className="vj-wlabel">{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
