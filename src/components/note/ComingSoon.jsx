/** Shown when a note file doesn't exist yet. */
export default function ComingSoon({ note, onBack }) {
  return (
    <div className="coming-soon-container">
      <div className="cs-badge">CURRICULUM UPDATE</div>
      <div className="cs-icon">🚧</div>
      <h1 className="cs-title">
        Module Under <span className="blue">Construction</span>
      </h1>
      <p className="cs-desc">
        We're polishing the notes for{' '}
        <strong>Day {note?.day}: {note?.title}</strong>. Check back soon!
      </p>
      <button className="cs-btn" onClick={onBack}>
        Back to Curriculum
      </button>
    </div>
  );
}
