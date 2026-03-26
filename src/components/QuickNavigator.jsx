import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function QuickNavigator({ weeks, activeWeekNum, activeDayNum, onNavigate, isOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if sidebar is open
  if (isOpen) return null;

  return (
    <div className={`quick-navigator ${isExpanded ? 'expanded' : ''}`}>
      <button className="quick-nav-trigger" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="trigger-content">
          <span className="nav-label">Curriculum Index</span>
          <div className="active-path">
            <span className="week-val">W{activeWeekNum || 1}</span>
            <ChevronRight size={12} />
            <span className="day-val">D{activeDayNum || 1}</span>
          </div>
        </div>
        <div className={`trigger-icon ${isExpanded ? 'rotated' : ''}`}>
          <ChevronDown size={14} />
        </div>
      </button>

      {isExpanded && (
        <div className="quick-nav-dropdown">
          <div className="dropdown-scroll-area">
            {weeks.map(week => (
              <div key={week.week} className="q-week-group">
                <div className={`q-week-header ${activeWeekNum === week.week ? 'active' : ''}`}>
                  Week {week.week} — {week.label}
                </div>
                <div className="q-day-list">
                  {week.days.map(day => (
                    <button
                      key={day.day}
                      className={`q-day-btn ${activeDayNum === day.day ? 'active' : ''}`}
                      onClick={() => {
                        onNavigate(week.week, day.day);
                        setIsExpanded(false);
                      }}
                    >
                      <div className="q-check">
                        {activeDayNum === day.day && <CheckCircle2 size={10} />}
                      </div>
                      <span className="q-title">{day.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
