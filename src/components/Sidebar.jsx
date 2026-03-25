import { useState, useRef, useEffect } from 'react';
import {
  Command, FileJson, Atom, Hexagon,
  LayoutDashboard, Layers, ChevronDown, ChevronRight,
  CheckCircle2, Trophy, Search, ChevronsUpDown, Check
} from 'lucide-react';
import { TRACKS } from '../data/tracks';

const TRACK_ICONS = { Command, FileJson, Atom, Hexagon };

export default function Sidebar({
  weeks, activeTrack, setActiveTrack,
  activeWeekNum, activeDayNum,
  onWeekChange, onDayChange, isOpen
}) {
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([activeWeekNum]));
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleWeek = (weekNum) => {
    const next = new Set(expandedWeeks);
    next.has(weekNum) ? next.delete(weekNum) : next.add(weekNum);
    setExpandedWeeks(next);
  };

  const totalDays = weeks.flatMap(w => w.days).length;

  const filteredWeeks = searchQuery.trim()
    ? weeks.map(w => ({
        ...w,
        days: w.days.filter(d =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(w => w.days.length > 0)
    : weeks;

  const currentTrack = TRACKS.find(t => t.id === activeTrack);
  const ActiveIcon = TRACK_ICONS[currentTrack?.icon];

  return (
    <aside className={`modern-sidebar ${!isOpen ? 'collapsed' : ''}`}>

      {/* ── Track Dropdown Selector ── */}
      <div className="track-switcher" ref={dropdownRef}>
        <div className="track-switcher-label">Curriculum Track</div>

        {/* Trigger button */}
        <button
          className="track-dropdown-trigger"
          style={{ '--track-color': currentTrack?.color, '--track-glow': currentTrack?.glow }}
          onClick={() => setDropdownOpen(o => !o)}
        >
          <div className="tdt-left">
            <div className="tdt-icon" style={{ color: currentTrack?.color, background: currentTrack?.glow }}>
              {ActiveIcon && <ActiveIcon size={14} />}
            </div>
            <div className="tdt-text">
              <span className="tdt-label">Track</span>
              <span className="tdt-value">{currentTrack?.label}</span>
            </div>
          </div>
          <ChevronsUpDown size={14} className={`tdt-chevron ${dropdownOpen ? 'open' : ''}`} />
        </button>

        {/* Glassmorphic dropdown panel */}
        {dropdownOpen && (
          <div className="track-dropdown-panel">
            {TRACKS.map(track => {
              const Icon = TRACK_ICONS[track.icon];
              const isActive = activeTrack === track.id;
              return (
                <button
                  key={track.id}
                  className={`track-dropdown-item ${isActive ? 'active' : ''}`}
                  style={{ '--ti-color': track.color, '--ti-glow': track.glow }}
                  onClick={() => { setActiveTrack(track.id); setDropdownOpen(false); }}
                >
                  <div className="tdi-icon" style={{ color: track.color, background: track.glow }}>
                    <Icon size={13} />
                  </div>
                  <div className="tdi-info">
                    <span className="tdi-name">{track.label}</span>
                    <span className="tdi-desc">{track.description}</span>
                  </div>
                  <div className="tdi-right">
                    {!track.available && <span className="track-wip">WIP</span>}
                    {isActive && <Check size={12} className="tdi-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search-container">
        <div className="search-box">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search topics..."
            className="search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Progress Card ── */}
      <div className="sidebar-progress-card">
        <div className="progress-header">
          <Trophy size={13} />
          <span>Curriculum Progress</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: '0%' }} />
        </div>
        <div className="progress-footer">
          <span>0 / {totalDays} completed</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="week-nav">
        <div className="nav-section-label">General</div>
        <button
          className={`curriculum-btn-modern ${activeDayNum === -1 ? 'active' : ''}`}
          onClick={() => onDayChange(-1)}
        >
          <LayoutDashboard size={16} />
          <span className="lbl">Dashboard Overview</span>
        </button>

        <div className="nav-section-label">Course Content</div>

        {/* ── Conditional: real content vs under-progress placeholder ── */}
        {activeTrack === 'system-design' ? (
          filteredWeeks.map(w => (
            <div key={w.week} className="modern-accordion">
              <button
                className={`modern-accordion-header ${expandedWeeks.has(w.week) ? 'expanded' : ''} ${activeWeekNum === w.week ? 'active-week' : ''}`}
                onClick={() => toggleWeek(w.week)}
              >
                <div className="header-left">
                  <Layers size={15} />
                  <span>Week {w.week} — {w.label}</span>
                </div>
                {expandedWeeks.has(w.week)
                  ? <ChevronDown size={13} />
                  : <ChevronRight size={13} />}
              </button>

              {expandedWeeks.has(w.week) && (
                <div className="modern-accordion-content">
                  {w.days.map(day => (
                    <button
                      key={day.day}
                      className={`modern-day-link ${activeDayNum === day.day ? 'active' : ''}`}
                      onClick={() => { onWeekChange(w.week); onDayChange(day.day); }}
                    >
                      <div className="link-dot" />
                      <span className="link-title">{day.title}</span>
                      {activeDayNum === day.day && <CheckCircle2 size={11} className="active-tick" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          /* ── Under Progress Glassmorphic Placeholder ── */
          <div className="under-progress-placeholder">
            <div className="up-icon">🚧</div>
            <div className="up-title">{currentTrack?.label} Track</div>
            <div className="up-desc">This curriculum is currently being crafted. Check back soon.</div>
            <div className="up-badge">Under Progress</div>
          </div>
        )}
      </div>
    </aside>
  );
}
