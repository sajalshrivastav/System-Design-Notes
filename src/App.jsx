import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';
import { Menu, X } from 'lucide-react';

import Sidebar from './components/Sidebar';
import NoteView from './components/NoteView';
import BottomNav from './components/BottomNav';
import QuickNavigator from './components/QuickNavigator';
import CodingQuestionsPage from './components/questions/CodingQuestionsPage';
import useNotes from './hooks/useNotes';

// Custom renderer to add IDs to headings for TOC
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const textVal = typeof text === 'object' ? text.text : text;
  const id = textVal.toLowerCase().replace(/[^\w]+/g, '-');
  if (level === 2 || level === 3) {
    return `<h${level} id="${id}">${textVal}</h${level}>`;
  }
  return `<h${level}>${textVal}</h${level}>`;
};

renderer.code = (codeArg, langArg) => {
  const code = typeof codeArg === 'object' ? codeArg.text : codeArg;
  const language = typeof codeArg === 'object' ? codeArg.lang : langArg;
  
  try {
    const validLanguage = (language && hljs.getLanguage(language)) ? language : '';
    if (validLanguage) {
      const highlighted = hljs.highlight(code, { language: validLanguage }).value;
      return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
    } else {
      const highlighted = hljs.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    }
  } catch (err) {
    return `<pre><code class="hljs">${code}</code></pre>`;
  }
};

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
  return marked.parse(lines.slice(bodyStart).join('\n'), { renderer });
}

export default function App() {
  const [activeTrack, setActiveTrack]   = useState('system-design');
  const [activeWeekNum, setActiveWeekNum] = useState(1);
  const [activeDayNum, setActiveDayNum] = useState(null);
  const [noteContent, setNoteContent]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [completedByTrack, setCompletedByTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('ff_completed_lessons');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist progress
  useEffect(() => {
    localStorage.setItem('ff_completed_lessons', JSON.stringify(completedByTrack));
  }, [completedByTrack]);

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
    // Only reset view to Home if we are currently on a lesson.
    // If we are on the Dashboard (-1), we stay there.
    if (activeDayNum !== -1) {
      setActiveDayNum(null);
    }
    
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

  // Automatically mark as complete when viewed
  useEffect(() => {
    if (activeDayNum > 0 && noteContent && noteContent !== 'COMING_SOON' && !loading) {
      setCompletedByTrack(prev => {
        const trackCompleted = prev[activeTrack] || [];
        if (!trackCompleted.includes(activeDayNum)) {
          return {
            ...prev,
            [activeTrack]: [...trackCompleted, activeDayNum]
          };
        }
        return prev;
      });
    }
  }, [activeDayNum, activeTrack, noteContent, loading]);



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
      activeDayNum === null && !showQuestions ? 'on-landing' : '',
    ].join(' ').trim()}>

      <button
        className={`sidebar-toggle ${activeDayNum === null && !showQuestions ? 'landing-toggle' : ''}`}
        onClick={() => setIsSidebarOpen(o => !o)}
        title={isSidebarOpen ? 'Collapse Sidebar' : 'Explore Curriculum'}
      >
        {isSidebarOpen ? <X size={18} /> : (
          <>
            <span className="toggle-icon"><Menu size={18} /></span>
            <span className="toggle-text">Explore</span>
          </>
        )}
      </button>

      {activeDayNum !== null && activeDayNum !== -1 && (
        <QuickNavigator 
          weeks={filteredWeeks}
          activeWeekNum={activeWeekNum}
          activeDayNum={activeDayNum}
          onNavigate={(w, d) => { setActiveWeekNum(w); setActiveDayNum(d); }}
          isOpen={isSidebarOpen}
        />
      )}

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
          {showQuestions ? (
            <CodingQuestionsPage onBack={() => setShowQuestions(false)} />
          ) : (
            <NoteView
              note={activeNote || (activeDayNum > 0 ? { day: activeDayNum, title: 'Upcoming Lesson', weekNum: activeWeekNum } : null)}
              noteContent={noteContent}
              loading={loading}
              weeks={filteredWeeks}
              activeTrack={activeTrack}
              setActiveTrack={setActiveTrack}
              onNavigate={(w, d) => { setActiveWeekNum(w); setActiveDayNum(d); }}
              prevNote={prevNote}
              nextNote={nextNote}
              activeDayNum={activeDayNum}
              completedCount={completedByTrack[activeTrack]?.length || 0}
              completedLessons={completedByTrack[activeTrack] || []}
              totalLessons={allNotes.length}
              onShowQuestions={() => setShowQuestions(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
