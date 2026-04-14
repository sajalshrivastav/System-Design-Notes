import { ChevronRight, CheckCircle } from 'lucide-react';

/**
 * Table of lessons for a selected week.
 * Each row is clickable and navigates to that day's note.
 */
export default function LessonTable({ week, onNavigate, completedLessons = [] }) {
  if (!week) return null;

  return (
    <div className="curriculum-list-wrap">
      <div className="list-header">
        <div className="lh-left">
          <span className="lh-badge">Phase {week.week}</span>
          <h2 className="lh-title">{week.label}</h2>
        </div>
        <div className="lh-right">
          <span className="lh-stats">{week.days.length} Lessons</span>
        </div>
      </div>

      <div className="lessons-list">
        {week.days.map((day) => {
          const isCompleted = completedLessons.includes(day.day);
          
          return (
            <div 
              key={day.day} 
              className={`lesson-item-row ${isCompleted ? 'is-done' : ''}`}
              onClick={() => onNavigate(week.week, day.day)}
            >
              <div className="li-status">
                {isCompleted ? (
                  <CheckCircle size={16} className="status-done" />
                ) : (
                  <span className="li-num">{day.day}</span>
                )}
              </div>
              
              <div className="li-content">
                <span className="li-title">{day.title}</span>
              </div>

              <div className="li-action">
                <ChevronRight size={16} className="li-arrow" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
