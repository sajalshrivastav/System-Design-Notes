import { ChevronRight } from 'lucide-react';

/**
 * Sticky header shown at the top of a note page.
 * Collapses on scroll (controlled by isScrolled).
 */
export default function NoteHeader({ note, isScrolled, onBack }) {
  return (
    <header className={`note-sticky-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-breadcrumbs">
        <span className="breadcrumb-link" onClick={onBack}>Curriculum</span>
        <ChevronRight size={11} />
        <span className="breadcrumb-current">Day {note.day}</span>
      </div>
      <h1>{note.title}</h1>
      <div className="page-meta">
        <span className="meta-tag week">Day {note.day}</span>
      </div>
    </header>
  );
}
