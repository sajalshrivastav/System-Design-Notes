import { useState, useEffect } from 'react';
import { ArrowRight, Code2, Cpu, Layout } from 'lucide-react';

/**
 * Premium Split-Screen Hero Section
 */
export default function HeroSection({ onScrollToCurriculum }) {
  const [typedCode, setTypedCode] = useState('');
  const fullCode = `const App = () => {
  const [count, setCount] = useState(0);
  return (
    <Button onClick={() => setCount(c => c + 1)}>
       Count: {count}
    </Button>
  );
};`;

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedCode(fullCode.slice(0, index));
      index++;
      if (index > fullCode.length) {
        setTimeout(() => { index = 0; }, 2000); 
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-split-container">
      <div className="hero-grid-bg" />
      <div className="hero-radial-glow" />

      {/* ── Background Floating Layer (Visible on all screens) ── */}
      <div className="hero-bg-floating-layer">
        <div className="floating-company-badge c-1">Meta</div>
        <div className="floating-company-badge c-2">Apple</div>
        <div className="floating-company-badge c-3">Amazon</div>
        <div className="floating-company-badge c-4">Netflix</div>
        <div className="floating-company-badge c-5">Google</div>
        
        <div className="floating-ui f-1"><Cpu size={28} color="var(--green)" /></div>
        <div className="floating-ui f-2"><Layout size={24} color="var(--green-dark)" /></div>
        <div className="floating-ui f-3"><div className="glass-card-mini" /></div>
      </div>

      <div className="hero-content-left">
        <div className="premium-badge">
          <span className="badge-pulse" />
          <span className="badge-label">Senior Frontend Curriculum</span>
        </div>

        <h1 className="hero-headline-main">
          Master <span className="text-highlight-purple">Frontend Interviews</span> <br />
          Like Top Engineers
        </h1>

        <p className="hero-subtext-main">
          Accelerate your career with deep architectural dives into 
          <strong> System Design</strong>, <strong>JavaScript Internals</strong>, 
          and production-grade React patterns.
        </p>

        <div className="hero-marquee-container">
          <div className="hero-marquee-track">
            <span>JavaScript</span><span className="dot" />
            <span>Design Patterns</span><span className="dot" />
            <span>React</span><span className="dot" />
            <span>Angular</span><span className="dot" />
            <span>System Design</span><span className="dot" />
            <span>Web Performance</span><span className="dot" />
            <span>Accessibility</span><span className="dot" />
            {/* Duplicated for smooth loop */}
            <span>JavaScript</span><span className="dot" />
            <span>Design Patterns</span><span className="dot" />
            <span>React</span><span className="dot" />
            <span>Angular</span><span className="dot" />
            <span>System Design</span><span className="dot" />
            <span>Web Performance</span><span className="dot" />
            <span>Accessibility</span>
          </div>
        </div>

        <div className="hero-cta-group">
          <button className="btn-primary-glow" onClick={onScrollToCurriculum}>
            Start Practicing <ArrowRight size={18} />
          </button>
          <button className="btn-secondary-outline">
            Explore Questions
          </button>
        </div>
      </div>

      <div className="hero-visual-right">
        <div className="visual-stack">
          <div className="code-editor-mock">
            <div className="editor-header">
              <div className="dots"><span /><span /><span /></div>
              <span className="file-name">App.jsx</span>
            </div>
            <div className="editor-body">
              <pre><code>{typedCode}<span className="cursor-blink">|</span></code></pre>
            </div>
          </div>

          <div className="preview-mock">
            <div className="preview-header">Live Preview</div>
            <div className="preview-body">
               <div className="preview-btn-demo">
                  Count: {typedCode.length > 80 ? '1' : '0'}
               </div>
               <div className="preview-dots"><span /><span /><span /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
