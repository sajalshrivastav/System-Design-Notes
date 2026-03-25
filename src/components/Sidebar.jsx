import { useState } from 'react';

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

  return (
    <aside className={`profile-card ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="profile-img-wrap-small">
          <div className="profile-img-placeholder-small">SD</div>
        </div>
        <div className="profile-info-small">
          <h3 className="profile-name-small">System Design</h3>
        </div>
      </div>

      <div className="sidebar-stats">
        <div className="stat-mini">
          <span className="val">+{weeks.flatMap(w => w.days).length}</span>
          <span className="lbl">Total</span>
        </div>
        <div className="stat-mini">
          <span className="val">W{activeWeekNum}</span>
          <span className="lbl">Active</span>
        </div>
      </div>

      <div className="week-nav">
        <button 
          className={`curriculum-btn ${activeDayNum === -1 ? 'active' : ''}`}
          onClick={() => onDayChange(-1)}
        >
          <span className="icon">🗺️</span>
          <span className="lbl">Master Curriculum</span>
        </button>

        <div className="section-divider">
          <span>CURRICULUM</span>
        </div>

        {weeks.map(w => (
          <div key={w.week} className="accordion-item">
            <button 
              className={`accordion-header ${expandedWeeks.has(w.week) ? 'expanded' : ''}`}
              onClick={() => toggleWeek(w.week)}
            >
              <span>Week {w.week}: {w.label}</span>
              <span className="icon">{expandedWeeks.has(w.week) ? '−' : '+'}</span>
            </button>
            
            {expandedWeeks.has(w.week) && (
              <div className="accordion-content">
                {w.days.map(day => (
                  <button
                    key={day.day}
                    className={`day-btn ${activeDayNum === day.day ? 'active' : ''}`}
                    onClick={() => {
                        onWeekChange(w.week);
                        onDayChange(day.day);
                    }}
                  >
                    <div className="day-row">
                      <span className="day-pill">{day.day}</span>
                      <span className="day-title-v">{day.title}</span>
                    </div>
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
