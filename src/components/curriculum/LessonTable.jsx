import { Clock, ChevronRight } from 'lucide-react';

/**
 * Table of lessons for a selected week.
 * Each row is clickable and navigates to that day's note.
 */
export default function LessonTable({ week, onNavigate }) {
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
              <th>Difficulty</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {week.days.map(day => (
              <tr
                key={day.day}
                className="lt-row"
                onClick={() => onNavigate(week.week, day.day)}
              >
                <td className="lt-day">
                  Day {String(day.day).padStart(2, '0')}
                </td>
                <td className="lt-topic">{day.title}</td>
                <td className="lt-diff">
                  <span className={`diff-pill ${day.difficulty?.toLowerCase().split(' ')[0]}`}>
                    {day.difficulty}
                  </span>
                </td>
                <td className="lt-time">
                  <Clock size={11} />
                  {day.time}
                </td>
                <td className="lt-cta">
                  <ChevronRight size={14} className="lt-arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
