import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  Clock,
  ChevronRight,
  Map,
  ShieldCheck,
  Zap,
  Cpu,
  Star
} from 'lucide-react';

export default function NoteView({ note, noteContent, loading, weeks, onNavigate }) {
  const contentRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCurriculum = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const totalDays = weeks.flatMap(w => w.days).length;

    return (
      <div className="welcome-screen custom-home landing-page">
        {/* Abstract 3D / Background Elements */}
        <div className="abstract-glow main-glow"></div>
        <div className="abstract-glow secondary-glow"></div>

        {/* Floating Feature Cards (The '3D Vector' look) */}
        <div className="floating-elements">
          <div className="f-card f1">
            <div className="f-icon-wrap"><Cpu size={16} /></div>
            <div className="f-text">
              <strong>Co-Pilot</strong>
              <span>Node Architecture</span>
            </div>
          </div>
          <div className="f-card f2">
            <div className="f-icon-wrap yellow"><Zap size={16} /></div>
            <div className="f-text">
              <strong>Automate</strong>
              <span>CI/CD Pipelines</span>
            </div>
          </div>
          <div className="f-card f3">
            <div className="f-icon-wrap green"><ShieldCheck size={16} /></div>
            <div className="f-text">
              <strong>Secure</strong>
              <span>OAuth & JWT</span>
            </div>
          </div>
        </div>

        <section className="hero-section">
          <div className="new-badge">
            <span className="badge-dot"></span> New: System Design v2.0
          </div>
          <h1 className="main-heading">
            Navigate <span className="text-gradient">front end interviews</span> with ease
          </h1>
          <p className="main-subtext">
            Meet the <strong>front end interview prep platform</strong> built to make your
            interviews much easier. Detailed architectural deep-dives for senior engineers.
          </p>

          <div className="hero-actions">
            <button className="btn-get-started" onClick={scrollToCurriculum}>
              Get started now <ArrowRight size={18} />
            </button>
            <button className="btn-secondary-link">Try the free questions</button>
          </div>

          <div className="trust-badges">
            <div className="user-avatars">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="avatar-placeholder" style={{ marginLeft: i > 1 ? '-12px' : '0', zIndex: 10 - i }}></div>
              ))}
            </div>
            <div className="trust-text">
              <span className="stars-row"><Star size={10} fill="currentColor" /><Star size={10} fill="currentColor" /><Star size={10} fill="currentColor" /></span>
              <strong>1M+ engineers</strong> prep with us every day
            </div>
          </div>
        </section>

        <section ref={contentRef} className="curriculum-overview">
          <div className="section-header">
            <h2 className="section-title-large">Master Curriculum</h2>
            <p className="section-subtitle-large">A systematic roadmap to frontend engineering mastery.</p>
          </div>

          <div className="premium-curriculum-container">
            {weeks.map(week => (
              <div key={week.week} className="week-group">
                <div className="week-label-strip">
                  <div className="w-icon"><Map size={18} /></div>
                  <div className="w-info">
                    <span className="w-num">WEEK {week.week}</span>
                    <span className="w-lbl">{week.label}</span>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th width="10%">DAY</th>
                        <th width="50%">TOPIC</th>
                        <th width="20%">DIFFICULTY</th>
                        <th width="20%">EST. TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {week.days.map(day => (
                        <tr key={day.day} onClick={() => onNavigate(week.week, day.day)}>
                          <td className="t-day">Day {String(day.day).padStart(2, '0')}</td>
                          <td className="t-topic">
                            <div className="topic-inner">
                              <span className="topic-text">{day.title}</span>
                              <ChevronRight className="hover-arrow" size={14} />
                            </div>
                          </td>
                          <td className="t-diff">
                            <span className={`diff-pill ${day.difficulty?.toLowerCase().split(' ')[0]}`}>
                              {day.difficulty}
                            </span>
                          </td>
                          <td className="t-time">
                            <div className="time-wrap">
                              <Clock size={12} /> {day.time}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
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
      <header className={`note-sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-breadcrumbs">
          <span className="breadcrumb-link" onClick={() => onNavigate(-1, -1)}>Curriculum</span>
          <ChevronRight size={12} />
          <span className="breadcrumb-current">Day {note.day}</span>
        </div>
        <h1>{note.title}</h1>
        <div className="page-meta">
          <span className="meta-tag week">Day {note.day}</span>
        </div>
      </header>
      <hr className="header-divider" />

      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: noteContent }}
      />
    </div>
  );
}
