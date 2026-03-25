import { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function NoteView({ note, noteContent, loading, weeks, onNavigate }) {
  const [tocContent, setTocContent] = useState('');
  const [tocLoading, setTocLoading] = useState(false);

  useEffect(() => {
    if (!note && !loading) {
      setTocLoading(true);
      fetch('/TOC.md')
        .then(res => res.text())
        .then(md => {
          setTocContent(marked.parse(md));
          setTocLoading(false);
        })
        .catch(err => {
          console.error("Failed to load TOC:", err);
          setTocLoading(false);
        });
    }
  }, [note, loading]);

  const handleTocClick = (e) => {
    const target = e.target.closest('td, li, p');
    if (!target) return;
    const text = target.innerText;
    const match = text.match(/Day\s+(\d+)/i);
    if (match) {
      const dayNum = parseInt(match[1]);
      const note = weeks.flatMap(w => w.days).find(d => d.day === dayNum);
      // Always navigate, even if note is missing from JSON, to trigger 'Coming Soon'
      onNavigate(note ? (note.weekNum || 1) : 1, dayNum);
    }
  };

  if (noteContent === 'COMING_SOON') {
    return (
      <div className="coming-soon-container">
        <div className="cs-badge">CURRICULUM UPDATE</div>
        <div className="cs-icon">🚧</div>
        <h1 className="cs-title">Module Under <span className="blue">Construction</span></h1>
        <p className="cs-desc">
          We are currently polishing the notes and interactive examples for 
          <strong> Day {note?.day || 'Upcoming'}: {note?.title || 'New Content'}</strong>. 
          Check back tomorrow!
        </p>
        <button className="cs-btn" onClick={() => onNavigate(-1, -1)}>Back to TOC</button>
      </div>
    );
  }

  if (!note && !loading) {
    return (
      <div className="welcome-screen">
        {tocLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading Curriculum...</span>
          </div>
        ) : (
          <div 
            className="markdown-body toc-page" 
            dangerouslySetInnerHTML={{ __html: tocContent }}
            onClick={handleTocClick}
            style={{ cursor: 'pointer' }}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Preparing {note?.title}...</span>
      </div>
    );
  }

  return (
    <div className="note-page">
      <header className="note-sticky-header">
        <h1>{note.title}</h1>
        <div className="page-meta" style={{ display: 'flex', gap: '8px', alignItems: "center" }}>
          <span className="meta-tag week">Day {note.day}</span>
          <span className="meta-tag diff">{note.difficulty}</span>
        </div>

      </header>
      <hr style={{ margin: '10px 0 0', borderColor: 'var(--border)' }} />

      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: noteContent }}
      />
    </div>
  );
}
