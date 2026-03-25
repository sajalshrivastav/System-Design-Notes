/**
 * Telegram-style paper plane — two overlapping triangles with teal gradient.
 * Rendered inside an SVG. Rotates to face the direction of travel.
 */
export default function PaperPlane({ x, y, angleDeg }) {
  return (
    <g style={{
      transform: `translate(${x}px, ${y}px) rotate(${angleDeg}deg)`,
      transformOrigin: '0px 0px',
      transition: 'transform 0.75s cubic-bezier(0.4,0,0.2,1)',
      filter: 'drop-shadow(0 0 7px rgba(56,189,248,0.8))',
    }}>
      <defs>
        <linearGradient id="paper-plane-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      {/* shadow wing — offset, lower opacity */}
      <path
        d="M -7 7 L 11 -2 L 2 11 Z"
        fill="url(#paper-plane-grad)"
        opacity="0.45"
        style={{ transform: 'translate(2.5px, 2.5px)' }}
      />
      {/* main wing */}
      <path d="M -7 7 L 11 -2 L 2 11 Z" fill="url(#paper-plane-grad)" />
    </g>
  );
}
