import { ChevronRight } from 'lucide-react';

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
        

      </div>
    </header>
  );
}
