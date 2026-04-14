import { useState, useEffect } from 'react';
import LessonTable from './LessonTable';
import { TRACKS } from '../../data/tracks';

/**
 * Orchestrates the journey track + lesson table.
 * - Desktop: two-column layout (vertical journey left, table right)
 * - Mobile:  stacked layout (horizontal journey top, table bottom)
 *
 * The right column height is measured via ResizeObserver so the
 * vertical journey SVG always fills the full container height.
 */
export default function CurriculumRoadmap({ weeks, activeTrack, setActiveTrack, onNavigate, completedLessons }) {
  const [selectedWeek, setSelectedWeek] = useState(() => weeks[0]?.week ?? null);

  // Default to first week when weeks load
  useEffect(() => {
    if (weeks.length > 0 && selectedWeek === null) {
      setSelectedWeek(weeks[0].week);
    }
  }, [weeks]);

  const selectedWeekData = weeks.find(w => w.week === selectedWeek);
  const hasContent       = weeks.length > 0;
  const currentTrack     = TRACKS.find(t => t.id === activeTrack);

  if (!hasContent) {
    return (
      <div className="track-under-progress">
        <div className="tup-icon">🚧</div>
        <h3>{currentTrack?.label} curriculum is under construction</h3>
        <p>Switch to System Design to start learning now.</p>
        <button className="cs-btn" onClick={() => setActiveTrack('system-design')}>
          Go to System Design
        </button>
      </div>
    );
  }

  return (
    <div className="curriculum-container-modern">
      {/* ── Phase Tabs (Pill Style) ── */}
      <div className="phase-pills-bar">
        {weeks.map((week) => (
          <button
            key={week.week}
            className={`phase-pill ${selectedWeek === week.week ? 'active' : ''}`}
            onClick={() => setSelectedWeek(week.week)}
          >
            <div className="p-pill-dot" />
            <div className="p-pill-content">
              <span className="p-pill-num">Phase {week.week}</span>
              <span className="p-pill-label">{week.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="curriculum-list-container">
        <LessonTable 
          week={selectedWeekData} 
          onNavigate={onNavigate} 
          completedLessons={completedLessons}
        />
      </div>
    </div>
  );
}
