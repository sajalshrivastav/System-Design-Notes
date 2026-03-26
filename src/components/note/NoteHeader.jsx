import { ChevronRight, Clock } from 'lucide-react';

/**
 * Sticky header shown at the top of a note page.
 * Collapses on scroll (controlled by isScrolled).
 */
export default function NoteHeader({ note, isScrolled, onBack, readingTime, progress = 0 }) {
  // Extract info from note or use defaults
  const trackName = note.track || 'System Design';
  const weekName = note.weekLabel || `Week ${note.weekNum || 1}`;
  const dayName = note.title || `Day ${note.day}`;
  const moduleLabel = `MODULE ${String(note.weekNum || 1).padStart(2, '0')} • LESSON ${String(note.day || 1).padStart(2, '0')}`;

  // SVG Progress values
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${(progress * circumference) / 100}, ${circumference}`;

  return (
    <header className={`note-structured-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-breadcrumbs">
        <span className="breadcrumb-link" onClick={onBack}>{trackName}</span>
        <ChevronRight size={11} className="sep" />
        <span className="breadcrumb-link">{weekName}</span>
        <ChevronRight size={11} className="sep" />
        <span className="breadcrumb-current">{dayName}</span>
      </div>

      <div className="module-badge">{moduleLabel}</div>
      
      <div className="header-title-row">
        <div className="title-left">
          <h1 className="main-title">{note.title}</h1>
          <p className="subtitle">
            A deep dive into the underlying architecture and patterns of this domain, focusing on real-world engineering challenges.
          </p>
        </div>
        
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">ESTIMATED TIME</span>
            <div className="stat-val-row">
              <Clock size={16} />
              <span className="stat-val">~{readingTime} minutes</span>
            </div>
          </div>
          <div className="progress-circle">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={dashArray}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">{Math.round(progress)}%</text>
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
