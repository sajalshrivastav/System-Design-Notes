import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import { Menu, X } from 'lucide-react';

import Sidebar from './components/Sidebar';
import NoteView from './components/NoteView';
import BottomNav from './components/BottomNav';
import useNotes from './hooks/useNotes';

// Parse markdown — strip H1 title + first HR (metadata block)
function parseMarkdown(md) {
  const lines = md.split('\n');
  let bodyStart = 0;
  let passedH1 = false, passedHr = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!passedH1 && l.startsWith('# ')) { passedH1 = true; bodyStart = i + 1; continue; }
    if (passedH1 && !passedHr && l === '---') { passedHr = true; bodyStart = i + 1; break; }
  }
  return marked.parse(lines.slice(bodyStart).join('\n'));
}

export default function App() {
  const [activeTrack, setActiveTrack]   = useState('system-design');
  const [activeWeekNum, setActiveWeekNum] = useState(1);
  const [activeDayNum, setActiveDayNum] = useState(null);
  const [noteContent, setNoteContent]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { getWeeks, getAllNotes, loading: notesLoading } = useNotes();

  // Stable memoized derivations — only recompute when track data or day changes
  const filteredWeeks = useMemo(() => getWeeks(activeTrack),    [getWeeks, activeTrack]);
  const allNotes      = useMemo(() => getAllNotes(activeTrack),  [getAllNotes, activeTrack]);

  const activeNote   = useMemo(
    () => activeDayNum > 0 ? allNotes.find(n => n.day === activeDayNum) ?? null : null,
    [allNotes, activeDayNum]
  );
  const currentIndex = useMemo(
    () => allNotes.findIndex(n => n.day === activeDayNum),
    [allNotes, activeDayNum]
  );
  const prevNote = currentIndex > 0                      ? allNotes[currentIndex - 1] : null;
  const nextNote = currentIndex < allNotes.length - 1   ? allNotes[currentIndex + 1] : null;

  // Track the file path we last fetched so we never double-fetch
  const lastFetchedFile = useRef(null);

  // Reset when track changes
  useEffect(() => {
    setActiveDayNum(null);
    setNoteContent(null);
    setActiveWeekNum(1);
    lastFetchedFile.current = null;
  }, [activeTrack]);

  // Fetch note — only when activeDayNum or the resolved file path changes
  useEffect(() => {
    if (!activeDayNum || activeDayNum <= 0) {
      setNoteContent('');
      return;
    }

    if (!activeNote) {
      setNoteContent('COMING_SOON');
      return;
    }

    // Guard: don't re-fetch the same file (e.g. caused by allNotes reference change)
    if (lastFetchedFile.current === activeNote.file) return;
    lastFetchedFile.current = activeNote.file;

    let cancelled = false;
    setLoading(true);

    fetch(`/${activeNote.file}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then(md => {
        if (cancelled) return;
        setNoteContent(parseMarkdown(md));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => {
        if (!cancelled) setNoteContent('COMING_SOON');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Cleanup: if day changes before fetch completes, ignore stale result
    return () => { cancelled = true; };
  }, [activeDayNum, activeNote?.file]); // ← file path, not the whole allNotes array

  // Highlight only the newly rendered note — scoped to .markdown-body
  useEffect(() => {
    if (!noteContent || noteContent === 'COMING_SOON') return;
    // Small timeout lets React finish painting before hljs runs
    const id = setTimeout(() => {
      document.querySelectorAll('.markdown-body pre code').forEach(block => {
        if (!block.dataset.highlighted) hljs.highlightElement(block);
      });
    }, 50);
    return () => clearTimeout(id);
  }, [noteContent]);

  const navigateTo = useCallback((note) => {
    if (!note) return;
    setActiveWeekNum(note.weekNum);
    setActiveDayNum(note.day);
  }, []);

  const handleDayChange = useCallback((day) => {
    setActiveDayNum(day);
    if (window.innerWidth <= 850) setIsSidebarOpen(false);
  }, []);

  if (notesLoading) {
    return (
      <div className="full-screen-loader">
        <div className="spinner" />
        <span>Syncing Curriculum...</span>
      </div>
    );
  }

  return (
    <div className={[
      'layout',
      !isSidebarOpen  ? 'sidebar-closed' : '',
      isSidebarOpen   ? 'mobile-open'    : '',
      activeDayNum === null ? 'on-landing' : '',
    ].join(' ').trim()}>

      <button
        className={`sidebar-toggle ${activeDayNum === null ? 'landing-toggle' : ''}`}
        onClick={() => setIsSidebarOpen(o => !o)}
        title={isSidebarOpen ? 'Collapse Sidebar' : 'Explore Curriculum'}
      >
        {isSidebarOpen ? <X size={18} /> : <><Menu size={18} /> Explore</>}
      </button>

      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        weeks={filteredWeeks}
        activeTrack={activeTrack}
        setActiveTrack={setActiveTrack}
        activeWeekNum={activeWeekNum}
        activeDayNum={activeDayNum}
        onWeekChange={setActiveWeekNum}
        onDayChange={handleDayChange}
        isOpen={isSidebarOpen}
      />

      <main className="main-content">
        <div className="content">
          <NoteView
            note={activeNote || (activeDayNum > 0 ? { day: activeDayNum, title: 'Upcoming Lesson' } : null)}
            noteContent={noteContent}
            loading={loading}
            weeks={filteredWeeks}
            activeTrack={activeTrack}
            setActiveTrack={setActiveTrack}
            onNavigate={(w, d) => { setActiveWeekNum(w); setActiveDayNum(d); }}
          />
        </div>

        {activeDayNum > 0 && (
          <BottomNav
            prev={prevNote}
            next={nextNote}
            onNavigate={navigateTo}
            currentIndex={currentIndex}
            total={allNotes.length}
          />
        )}
      </main>
    </div>
  );
}
