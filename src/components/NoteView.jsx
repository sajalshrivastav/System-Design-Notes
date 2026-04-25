import { useRef, useMemo, useState, useEffect } from 'react';
import useScrolled from '../hooks/useScrolled';
import FloatingCards from './landing/FloatingCards';
import HeroSection from './landing/HeroSection';
import CurriculumRoadmap from './curriculum/CurriculumRoadmap';
import ComingSoon from './note/ComingSoon';
import NoteHeader from './note/NoteHeader';
import LessonLayout from './note/LessonLayout';
import { TRACKS } from '../data/tracks';

/**
 * NoteView — top-level view switcher.
 */
export default function NoteView({
  note,
  noteContent,
  loading,
  weeks,
  activeTrack,
  setActiveTrack,
  onNavigate,
  prevNote,
  nextNote,
  activeDayNum,
  completedCount,
  completedLessons,
  totalLessons,
  onShowQuestions,
  progress,
}) {
  const curriculumRef = useRef(null);
  const isScrolled = useScrolled(40);


  // ── Extract TOC ────────────────────────────────────────────────────────
  const toc = useMemo(() => {
    if (!noteContent || noteContent === 'COMING_SOON') return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(noteContent, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');

    return Array.from(headings).map((h, i) => {
      const id = h.id || `heading-${i}`;
      return {
        id,
        text: h.innerText,
        level: h.tagName.toLowerCase()
      };
    });
  }, [noteContent]);

  // ── Reading Time Estimation ──────────────────────────────────────────
  const readingTime = useMemo(() => {
    if (!noteContent) return 0;
    const wordsPerMinute = 200;
    // Strip HTML tags to count words
    const text = noteContent.replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }, [noteContent]);

  // ── Coming Soon ──────────────────────────────────────────────────────────
  if (noteContent === 'COMING_SOON') {
    return (
      <ComingSoon
        note={note}
        onBack={() => onNavigate(-1, -1)}
      />
    );
  }

  // ── Dashboard View ──────────────────────────────────────────────────────
  if (activeDayNum === -1) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header-modern">
          <div className="dh-left">
            <h1 className="dh-title">Explore Tracks</h1>
            <p className="dh-subtitle">Dive into architectural learning and track your progress.</p>
          </div>
          <div className="dh-actions">
            <div className="dh-stat-pill">
              <span className="dh-stat-val">{completedCount}/{totalLessons}</span>
              <span className="dh-stat-lbl">Lessons</span>
            </div>
          </div>
        </div>

        {/* Track Selection Tabs */}
        <div className="track-tabs-row">
          {TRACKS.map((track) => (
            <button
              key={track.id}
              className={`track-tab-pill ${activeTrack === track.id ? 'active' : ''}`}
              onClick={() => setActiveTrack(track.id)}
              style={{
                '--track-active-bg': track.color + '22',
                '--track-active-border': track.color + '44'
              }}
            >
              <span className="tab-indicator" style={{ background: track.color }} />
              {track.label}
              {!track.available && <span className="tab-soon">Soon</span>}
            </button>
          ))}
        </div>

        <CurriculumRoadmap
          weeks={weeks}
          activeTrack={activeTrack}
          setActiveTrack={setActiveTrack}
          onNavigate={onNavigate}
          completedLessons={completedLessons}
        />
      </div>
    );
  }

  // ── Landing Page (Default Home) ──────────────────────────────────────────
  if (activeDayNum === null && !loading) {
    return (
      <div className="welcome-screen custom-home landing-page">
        <div className="abstract-glow main-glow" />
        <div className="abstract-glow secondary-glow" />

        <FloatingCards />

        <HeroSection
          activeTrack={activeTrack}
          setActiveTrack={setActiveTrack}
          onScrollToCurriculum={() => onNavigate(-1, -1)}
          onShowQuestions={onShowQuestions}
        />

        {/* Removed Roadmap from landing - now on Dashboard */}
        <div className="landing-footer-blur" />
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Preparing {note?.title}...</span>
      </div>
    );
  }

  // ── Note Content ─────────────────────────────────────────────────────────
  return (
    <div className="note-structured-container">
      <NoteHeader
        note={note}
        isScrolled={isScrolled}
        onBack={() => onNavigate(-1, -1)}
        readingTime={readingTime}
        progress={progress}
      />

      <LessonLayout
        prevNote={prevNote}
        nextNote={nextNote}
        onNavigate={(n) => onNavigate(n.weekNum, n.day)}
      >
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: noteContent }}
        />
      </LessonLayout>
    </div>
  );
}
