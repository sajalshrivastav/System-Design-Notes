

export default function LessonLayout({ children, onNavigate, prevNote, nextNote }) {

  return (
    <div className="lesson-container">
      <div className="lesson-main-content">
        {children}
        

      </div>
    </div>
  );
}
