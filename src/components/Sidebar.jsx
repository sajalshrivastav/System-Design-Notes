import React, { useState } from 'react';
import {
  Home,
  Compass,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { TRACKS } from '../data/tracks';

export default function Sidebar({
  activeDayNum,
  onDayChange,
  isOpen,
  activeTrack,
  setActiveTrack
}) {
  const [isExploreExpanded, setIsExploreExpanded] = useState(true);

  return (
    <aside className={`modern-sidebar notion-style ${!isOpen ? 'collapsed' : ''}`}>
      {/* ── Static Sidebar Brand ── */}
      <div className="sidebar-brand-static">
        <div className="logo-stack-bg">
          <div className="stack-layer top"></div>
          <div className="stack-layer middle"></div>
          <div className="stack-layer bottom"></div>
        </div>
        <div className="workspace-info">
          <span className="brand-name-notion">Binary.Dev</span>
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="sidebar-nav-notion">
        {/* Home Button */}
        <button
          className={`nav-btn-notion ${activeDayNum === null ? 'active' : ''}`}
          onClick={() => onDayChange(null)}
        >
          <Home size={18} className="nav-icon-notion" />
          <span className="nav-btn-label-notion">Home</span>
          {activeDayNum === null && <div className="active-glow-notion" />}
        </button>

        {/* Explore Tracks Accordion */}
        <div className="sidebar-accordion">
          <button
            className={`nav-btn-notion ${activeDayNum === -1 ? 'active' : ''}`}
            onClick={() => setIsExploreExpanded(!isExploreExpanded)}
          >
            <Compass size={18} className="nav-icon-notion" />
            <span className="nav-btn-label-notion">Explore Tracks</span>
            {isExploreExpanded ? <ChevronDown size={14} className="acc-arrow" /> : <ChevronRight size={14} className="acc-arrow" />}
          </button>

          {isExploreExpanded && (
            <div className="sidebar-sub-menu">
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  className={`sub-nav-item ${activeTrack === track.id && activeDayNum === -1 ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTrack(track.id);
                    onDayChange(-1);
                  }}
                >
                  <div className="track-dot" style={{ background: track.color }} />
                  <span className="sub-nav-label">{track.label}</span>
                  {!track.available && <span className="sub-soon-badge">Soon</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Utilities/Footer removed as requested */}
    </aside>
  );
}

