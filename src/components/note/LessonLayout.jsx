import React from 'react';
import { CheckCircle2, List, Link, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LessonLayout({ children, toc, onNavigate, prevNote, nextNote }) {
  const milestones = [
    "Understood core architecture",
    "Analyzed the request lifecycle",
    "Reviewed critical rendering path",
    "Completed all code exercises"
  ];

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

      <aside className="lesson-sidebar">
        <div className="sidebar-card milestone-card">
          <div className="card-header">
            <CheckCircle2 size={16} />
            <h3>LESSON MILESTONES</h3>
          </div>
          <div className="milestone-list">
            {milestones.map((m, i) => (
              <div key={i} className="milestone-item">
                <div className="check-box" />
                <span>{m}</span>
              </div>
            ))}
          </div>
          <button className="complete-btn-premium">
            MARK LESSON AS COMPLETE
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="sidebar-card toc-card">
          <div className="card-header">
            <List size={16} />
            <h3>TABLE OF CONTENTS</h3>
          </div>
          <div className="toc-list">
            {toc && toc.length > 0 ? (
              toc.map((item, i) => (
                <a key={i} href={`#${item.id}`} className="toc-link">
                  <span className="toc-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="toc-text">{item.text}</span>
                </a>
              ))
            ) : (
              <p className="empty-msg">No headings found</p>
            )}
          </div>
        </div>

        <div className="sidebar-card supplementary-card">
          <div className="card-header">
            <Link size={16} />
            <h3>SUPPLEMENTARY</h3>
          </div>
          <div className="supplementary-list">
            <div className="supp-item">
              <div className="supp-icon">📘</div>
              <span>System Design Cheat Sheet</span>
            </div>
            <div className="supp-item">
              <div className="supp-icon">🛠️</div>
              <span>Visualizing Data Flows</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
