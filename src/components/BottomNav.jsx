export default function BottomNav({ prev, next, onNavigate, currentIndex, total }) {
  return (
    <footer className="bottom-nav">
      <div className="nav-container">
        <button
          className={`nav-btn prev ${!prev ? 'disabled' : ''}`}
          onClick={() => onNavigate(prev)}
          disabled={!prev}
        >
          <span className="arrow">←</span>
          <div className="btn-text">
            <span className="label">PREVIOUS</span>
            <span className="title">{prev ? `Day-${prev.day}` : 'Start'}</span>
          </div>
        </button>

        <div className="nav-center">
          <span className="progress">Note {currentIndex + 1} of {total}</span>
        </div>

        <button
          className={`nav-btn next ${!next ? 'disabled' : ''}`}
          onClick={() => onNavigate(next)}
          disabled={!next}
        >
          <div className="btn-text">
            <span className="label">NEXT</span>
            <span className="title">{next ? `Day-${next.day}` : 'Completed'}</span>
          </div>
          <span className="arrow">→</span>
        </button>
      </div>
    </footer>
  );
}
