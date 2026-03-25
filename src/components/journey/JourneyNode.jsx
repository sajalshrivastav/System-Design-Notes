/**
 * A single clickable week node rendered inside an SVG.
 * Shared between VerticalJourney and HorizontalJourney.
 */
export default function JourneyNode({ node, isActive, isPast, activeRadius = 15, inactiveRadius = 11, onSelect }) {
  const { x, y, week } = node;

  return (
    <g onClick={() => onSelect(week)} style={{ cursor: 'pointer' }}>
      {/* glow ring on active */}
      {isActive && (
        <circle
          cx={x} cy={y} r={activeRadius + 7}
          fill="rgba(99,102,241,0.1)"
          stroke="rgba(99,102,241,0.25)"
          strokeWidth="1"
        />
      )}

      {/* main circle */}
      <circle
        cx={x} cy={y}
        r={isActive ? activeRadius : inactiveRadius}
        fill={isActive ? '#6366f1' : isPast ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)'}
        stroke={isActive ? '#818cf8' : isPast ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}
        strokeWidth={isActive ? 2 : 1}
        style={{ transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* week label inside circle */}
      <text
        x={x} y={y + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={isActive ? '#fff' : 'rgba(255,255,255,0.4)'}
        fontSize="8" fontWeight="700" fontFamily="Inter,sans-serif"
      >
        W{week}
      </text>
    </g>
  );
}
