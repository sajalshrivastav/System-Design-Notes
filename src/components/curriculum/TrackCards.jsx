import { Command, FileJson, Atom, Hexagon } from 'lucide-react';
import { TRACKS } from '../../data/tracks';

const TRACK_ICONS = { Command, FileJson, Atom, Hexagon };

/**
 * Row of track selector cards shown on the landing hero.
 * Clicking a card calls setActiveTrack in App (single source of truth).
 */
export default function TrackCards({ activeTrack, setActiveTrack }) {
  return (
    <div className="track-cards-row">
      {TRACKS.map(track => {
        const Icon     = TRACK_ICONS[track.icon];
        const isActive = activeTrack === track.id;

        return (
          <button
            key={track.id}
            className={`track-card ${isActive ? 'active' : ''}`}
            style={{ '--tc': track.color, '--tg': track.glow }}
            onClick={() => setActiveTrack(track.id)}
          >
            <div className="tc-icon" style={{ background: track.glow, color: track.color }}>
              <Icon size={18} />
            </div>
            <div className="tc-info">
              <span className="tc-name">{track.label}</span>
              <span className="tc-desc">{track.description}</span>
            </div>
            {!track.available && <span className="tc-wip">Soon</span>}
            {isActive && <div className="tc-active-dot" />}
          </button>
        );
      })}
    </div>
  );
}
