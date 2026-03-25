import { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Trophy,
  Search
} from 'lucide-react';

export default function Sidebar({ weeks, activeWeekNum, activeDayNum, onWeekChange, onDayChange, isOpen }) {
  const [expandedWeeks, setExpandedWeeks] = useState(new Set([activeWeekNum]));

  const toggleWeek = (weekNum) => {
    const next = new Set(expandedWeeks);
    if (next.has(weekNum)) {
      next.delete(weekNum);
    } else {
      next.add(weekNum);
    }
    setExpandedWeeks(next);
  };

  const totalDays = weeks.flatMap(w => w.days).length;
  const completedPercentage = 0; // Placeholder for now

  return (
    <aside className={`profile-card modern-sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <BookOpen color="white" size={20} />
        </div>
        <div className="brand-text">
          <h3 className="brand-name">Interview Prep</h3>
          <span className="brand-tagline">Mastering Frontend</span>
        </div>
      </div>

      <div className="sidebar-search-container">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input type="text" placeholder="Search topics..." className="search-input" />
        </div>
      </div>

      <div className="sidebar-progress-card">
        <div className="progress-header">
          <Trophy size={14} />
          <span>Curriculum Progress</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${completedPercentage}%` }}></div>
        </div>
        <div className="progress-footer">
          <span>0 / {totalDays} completed</span>
        </div>
      </div>

      <div className="week-nav">
        <div className="nav-section-label">General</div>
        <button 
          className={`curriculum-btn-modern ${activeDayNum === -1 ? 'active' : ''}`}
          onClick={() => onDayChange(-1)}
        >
          <LayoutDashboard size={18} />
          <span className="lbl">Dashboard Overview</span>
        </button>

        <div className="nav-section-label">Course Content</div>
        
        {weeks.map(w => (
          <div key={w.week} className="modern-accordion">
            <button 
              className={`modern-accordion-header ${expandedWeeks.has(w.week) ? 'expanded' : ''} ${activeWeekNum === w.week ? 'active-week' : ''}`}
              onClick={() => toggleWeek(w.week)}
            >
              <div className="header-left">
                <Layers size={16} />
                <span>Week {w.week}</span>
              </div>
              {expandedWeeks.has(w.week) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {expandedWeeks.has(w.week) && (
              <div className="modern-accordion-content">
                {w.days.map(day => (
                  <button
                    key={day.day}
                    className={`modern-day-link ${activeDayNum === day.day ? 'active' : ''}`}
                    onClick={() => {
                        onWeekChange(w.week);
                        onDayChange(day.day);
                    }}
                  >
                    <div className="link-dot"></div>
                    <span className="link-title">{day.title}</span>
                    {activeDayNum === day.day && <CheckCircle2 size={12} className="active-tick" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
