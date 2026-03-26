import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function LessonLayout({ children, onNavigate, prevNote, nextNote }) {

  return (
    <div className="lesson-container">
      <div className="lesson-main-content">
        {children}
        
        {/* Bottom Navigation */}
        <div className="lesson-footer-nav">
          {prevNote ? (
            <div className="nav-card prev" onClick={() => onNavigate(prevNote)}>
              <div className="nav-icon"><ArrowLeft size={18} /></div>
              <div className="nav-info">
                <span className="nav-label">PREVIOUS LESSON</span>
                <span className="nav-title">{prevNote.title}</span>
              </div>
            </div>
          ) : <div className="nav-card-placeholder" />}

          {nextNote ? (
            <div className="nav-card next" onClick={() => onNavigate(nextNote)}>
              <div className="nav-info">
                <span className="nav-label">NEXT LESSON</span>
                <span className="nav-title">{nextNote.title}</span>
              </div>
              <div className="nav-icon"><ArrowRight size={18} /></div>
            </div>
          ) : <div className="nav-card-placeholder" />}
        </div>
      </div>
    </div>
  );
}
