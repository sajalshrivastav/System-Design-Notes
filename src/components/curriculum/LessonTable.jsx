import { ChevronRight, CheckCircle } from 'lucide-react';

/**
 * Table of lessons for a selected week.
 * Each row is clickable and navigates to that day's note.
 */
export default function LessonTable({ week, onNavigate, completedLessons = [] }) {
  if (!week) return null;

  return (
    <div className="lt-wrap">
      <div className="lt-header">
        <span className="lt-week-badge">Week {week.week}</span>
        <span className="lt-week-title">{week.label}</span>
        <span className="lt-count">{week.days.length} lessons</span>
      </div>

      <div className="lt-table-wrap">
        <table className="lt-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Topic</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {week.days.map(day => {
              const isCompleted = completedLessons.includes(day.day);
              return (
                <tr
                  key={day.day}
                  className={`lt-row ${isCompleted ? 'completed-row' : ''}`}
                  onClick={() => onNavigate(week.week, day.day)}
                >
                  <td className="lt-day">
                    Day {String(day.day).padStart(2, '0')}
                  </td>
                  <td className="lt-topic">
                    <div className="topic-name-wrap">
                      {isCompleted && <CheckCircle size={14} className="topic-check" />}
                      {day.title}
                    </div>
                  </td>
                  <td className="lt-cta">
                    <ChevronRight size={14} className="lt-arrow" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
