import React from 'react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';

export default function BottomNav({ prev, next, onNavigate, currentIndex, total, trackLabel, progress }) {
  return (
    <footer className="floating-bottom-nav">
      {/* Visual progress line at the very top of the bar */}
      <div className="bottom-nav-glass">
        <div className="nav-progress-rail">
          <div className="nav-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Previous Button */}
        <button 
          className={`nav-action-btn ${!prev ? 'disabled' : ''}`}
          onClick={() => prev && onNavigate(prev)}
          disabled={!prev}
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        {/* Center Track Info (No more text progress) */}
        <div className="nav-track-info">
          <List size={16} className="track-icon" />
          <span className="track-label">{trackLabel}</span>
        </div>

        {/* Next Button */}
        <button 
          className={`nav-action-btn ${!next ? 'disabled' : ''}`}
          onClick={() => next && onNavigate(next)}
          disabled={!next}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
}


