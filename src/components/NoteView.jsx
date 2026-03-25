import { useRef } from 'react';
import useScrolled from '../hooks/useScrolled';
import FloatingCards from './landing/FloatingCards';
import HeroSection from './landing/HeroSection';
import CurriculumRoadmap from './curriculum/CurriculumRoadmap';
import ComingSoon from './note/ComingSoon';
import NoteHeader from './note/NoteHeader';

/**
 * NoteView — top-level view switcher.
 *
 * Renders one of four states:
 *   1. Landing / Dashboard  (note === null)
 *   2. Loading spinner
 *   3. Coming Soon          (noteContent === 'COMING_SOON')
 *   4. Note content         (markdown rendered)
 */
export default function NoteView({
  note,
  noteContent,
  loading,
  weeks,
  activeTrack,
  setActiveTrack,
  onNavigate,
}) {
  const curriculumRef = useRef(null);
  const isScrolled    = useScrolled(40);

  const scrollToCurriculum = () =>
    curriculumRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Coming Soon ──────────────────────────────────────────────────────────
  if (noteContent === 'COMING_SOON') {
    return (
      <ComingSoon
        note={note}
        onBack={() => onNavigate(-1, -1)}
      />
    );
  }

  // ── Landing / Dashboard ──────────────────────────────────────────────────
  if (!note && !loading) {
    return (
      <div className="welcome-screen custom-home landing-page">
        <div className="abstract-glow main-glow" />
        <div className="abstract-glow secondary-glow" />

        <FloatingCards />

        <HeroSection
          activeTrack={activeTrack}
          setActiveTrack={setActiveTrack}
          onScrollToCurriculum={scrollToCurriculum}
        />

        <section ref={curriculumRef} className="curriculum-overview">
          <div className="section-header">
            <h2 className="section-title-large">Curriculum Roadmap</h2>
            <p className="section-subtitle-large">
              Click a week on the journey to explore its lessons.
            </p>
          </div>

          <CurriculumRoadmap
            weeks={weeks}
            activeTrack={activeTrack}
            setActiveTrack={setActiveTrack}
            onNavigate={onNavigate}
          />
        </section>
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
    <div className="note-page">
      <NoteHeader
        note={note}
        isScrolled={isScrolled}
        onBack={() => onNavigate(-1, -1)}
      />
      <hr className="header-divider" />
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: noteContent }}
      />
    </div>
  );
}
