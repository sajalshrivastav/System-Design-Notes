import { useRef, useState, useEffect } from 'react';
import useIsMobile from '../../hooks/useIsMobile';
import VerticalJourney from '../journey/VerticalJourney';
import HorizontalJourney from '../journey/HorizontalJourney';
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
export default function CurriculumRoadmap({ weeks, activeTrack, setActiveTrack, onNavigate }) {
  const rightColRef = useRef(null);
  const [selectedWeek, setSelectedWeek] = useState(() => weeks[0]?.week ?? null);
  const [rightHeight, setRightHeight]   = useState(400);
  const isMobile = useIsMobile(700);

  // Default to first week when weeks load
  useEffect(() => {
    if (weeks.length > 0 && selectedWeek === null) {
      setSelectedWeek(weeks[0].week);
    }
  }, [weeks]);

  // Sync right column height → vertical journey fills it
  useEffect(() => {
    if (!rightColRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setRightHeight(e.contentRect.height);
    });
    ro.observe(rightColRef.current);
    return () => ro.disconnect();
  }, [selectedWeek]);

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

  if (isMobile) {
    return (
      <div className="journey-layout-mobile">
        <div className="journey-top">
          <HorizontalJourney
            weeks={weeks}
            activeWeekNum={selectedWeek}
            onSelectWeek={setSelectedWeek}
          />
        </div>
        <div className="journey-bottom">
          <LessonTable week={selectedWeekData} onNavigate={onNavigate} />
        </div>
      </div>
    );
  }

  return (
    <div className="journey-layout">
      <div className="journey-left" style={{ minHeight: rightHeight }}>
        <VerticalJourney
          weeks={weeks}
          activeWeekNum={selectedWeek}
          onSelectWeek={setSelectedWeek}
          containerHeight={rightHeight}
        />
      </div>
      <div className="journey-right" ref={rightColRef}>
        <LessonTable week={selectedWeekData} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
