import { useState, useEffect } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/monokai-sublime.css';

// Components
import Sidebar from './components/Sidebar';
import NoteView from './components/NoteView';
import BottomNav from './components/BottomNav';

// Hooks
import useNotes from './hooks/useNotes';

function App() {
  const { data, allNotes, loading: notesLoading } = useNotes();
  const [activeWeekNum, setActiveWeekNum] = useState(1);
  const [activeDayNum, setActiveDayNum] = useState(null);
  const [noteContent, setNoteContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Derived state
  const activeNote = activeDayNum === -1 ? null : allNotes.find(n => n.day === activeDayNum);
  const currentIndex = allNotes.findIndex(n => n.day === activeDayNum);
  const prevNote = currentIndex > 0 ? allNotes[currentIndex - 1] : null;
  const nextNote = currentIndex < allNotes.length - 1 ? allNotes[currentIndex + 1] : null;

  useEffect(() => {
    if (activeDayNum !== null && activeDayNum > 0) {
      if (activeNote) {
        setLoading(true);
        fetch(`/${activeNote.file}`)
          .then((res) => {
            if (!res.ok) throw new Error('Not found');
            return res.text();
          })
          .then((md) => {
            const lines = md.split('\n');
            let bodyStart = 0;
            let passedH1 = false, passedHr = false;
            for (let i = 0; i < lines.length; i++) {
              const l = lines[i].trim();
              if (!passedH1 && l.startsWith('# ')) { passedH1 = true; bodyStart = i + 1; continue; }
              if (passedH1 && !passedHr && l === '---') { passedHr = true; bodyStart = i + 1; break; }
            }
            const body = lines.slice(bodyStart).join('\n');
            setNoteContent(marked.parse(body));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          })
          .catch((e) => {
            console.error(e);
            setNoteContent('COMING_SOON');
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        // Note is entirely missing from notes.json (e.g. Day 13)
        setNoteContent('COMING_SOON');
        setLoading(false);
      }
    } else {
      setNoteContent(''); // Clear content if activeDayNum is null or -1
    }
  }, [activeDayNum, allNotes]); // Add allNotes to dependencies

  useEffect(() => {
    if (noteContent && noteContent !== 'COMING_SOON') {
      hljs.highlightAll();
    }
  }, [noteContent]);

  // The loadNote function is no longer needed as its logic is integrated into the useEffect.
  // Keeping it commented out for reference if needed, but it's effectively replaced.
  /*
  const loadNote = async (day) => {
    const note = allNotes.find(n => n.day === day);
    if (!note) return;

    setLoading(true);
    try {
      const res = await fetch(`/${note.file}`);
      if (!res.ok) throw new Error('Not found');
      const md = await res.text();

      // Simple Markdown Header Parser
      const lines = md.split('\n');
      let bodyStart = 0;
      let passedH1 = false, passedHr = false;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!passedH1 && l.startsWith('# ')) { passedH1 = true; bodyStart = i + 1; continue; }
        if (passedH1 && !passedHr && l === '---') { passedHr = true; bodyStart = i + 1; break; }
      }

      const body = lines.slice(bodyStart).join('\n');
      setNoteContent(marked.parse(body));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      setNoteContent(`<div style="color:#f43f5e">Could not load note content. Check if the file exists.</div>`);
    } finally {
      setLoading(false);
  */

  const navigateTo = (note) => {
    if (!note) return;
    setActiveWeekNum(note.weekNum);
    setActiveDayNum(note.day);
  };

  if (notesLoading) {
    return (
      <div className="full-screen-loader">
        <div className="spinner"></div>
        <span>Syncing Repository Curriculum...</span>
      </div>
    );
  }

  return (
    <div className={`layout ${!isSidebarOpen ? 'sidebar-closed' : ''} ${isSidebarOpen ? 'mobile-open' : ''}`}>
      
      {/* Sidebar Toggle Button */}
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar Component */}
      <Sidebar 
        weeks={data.weeks} 
        activeWeekNum={activeWeekNum} 
        activeDayNum={activeDayNum}
        onWeekChange={setActiveWeekNum}
        onDayChange={(day) => {
          setActiveDayNum(day);
          if (window.innerWidth <= 850) {
            setIsSidebarOpen(false);
          }
        }}
        isOpen={isSidebarOpen}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content">
          <NoteView 
            note={activeNote || (activeDayNum > 0 ? { day: activeDayNum, title: 'Upcoming Lesson' } : null)} 
            noteContent={noteContent} 
            loading={loading}
            weeks={data?.weeks || []}
            onNavigate={(w, d) => {
              setActiveWeekNum(w);
              setActiveDayNum(d);
            }}
          />
        </div>

        {/* Bottom Navigation Navbar */}
        {activeDayNum && (
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

export default App;
