import { ArrowRight } from 'lucide-react';
import TrackCards from '../curriculum/TrackCards';

/**
 * Landing page hero — headline, subtext, track selector, CTA button.
 * onScrollToCurriculum scrolls to the roadmap section below.
 */
export default function HeroSection({ activeTrack, setActiveTrack, onScrollToCurriculum }) {
  return (
    <section className="hero-section">
      <div className="new-badge">
        <span className="badge-dot" /> New: System Design v2.0
      </div>

      <h1 className="main-heading">
        Navigate <span className="text-gradient">frontend interviews</span> with ease
      </h1>

      <p className="main-subtext">
        A <strong>multi-track interview prep platform</strong> built for senior engineers.
        Deep architectural dives across System Design, JavaScript, React, and Angular.
      </p>

      <TrackCards activeTrack={activeTrack} setActiveTrack={setActiveTrack} />

      <div className="hero-actions">
        <button className="btn-get-started" onClick={onScrollToCurriculum}>
          Explore Curriculum <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}
