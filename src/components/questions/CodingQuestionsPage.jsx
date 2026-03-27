import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Code2, Layers, Atom, Cpu, BrainCircuit,
  Lightbulb, ExternalLink, Search, X, ChevronLeft,
  Filter, CheckCircle2, Circle, ChevronDown
} from 'lucide-react';
import { data as dsaData } from '../../data/DSA.js';

/* ── Tab configuration ──────────────────────────────── */
const TABS = [
  { id: 'dsa',         label: 'DSA',              icon: Code2,       available: true  },
  { id: 'react',       label: 'React',             icon: Atom,        available: false },
  { id: 'javascript',  label: 'JavaScript',        icon: Layers,      available: false },
  { id: 'machine',     label: 'Machine Coding',    icon: Cpu,         available: false },
  { id: 'interview',   label: 'Interview',         icon: BrainCircuit,available: false },
  { id: 'tricky',      label: 'Tricky',            icon: Lightbulb,   available: false },
];

/* ── Sub-tabs for DSA ───────────────────────────────── */
const DSA_LISTS = [
  { id: 'neetcode150', label: 'NeetCode 150' },
  { id: 'neetcode250', label: 'NeetCode 250' },
];

/* ── Difficulty pill color ──────────────────────────── */
function DiffPill({ difficulty }) {
  const cls = difficulty === 'Easy'
    ? 'q-diff-easy'
    : difficulty === 'Medium'
    ? 'q-diff-medium'
    : 'q-diff-hard';
  return <span className={`q-diff-pill ${cls}`}>{difficulty}</span>;
}

/* ── Category colour tag ────────────────────────────── */
const CAT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#14b8a6','#f43f5e','#a855f7','#06b6d4',
];
function catColor(cat) {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return CAT_COLORS[Math.abs(hash) % CAT_COLORS.length];
}

/* ══════════════════════════════════════════════════════ */
export default function CodingQuestionsPage({ onBack }) {
  const [activeTab, setActiveTab]     = useState('dsa');
  const [dsaList, setDsaList]         = useState('neetcode250');
  const [search, setSearch]           = useState('');
  const [diffFilter, setDiffFilter]   = useState('All');
  const [catFilter, setCatFilter]     = useState('All');
  const [isCatOpen, setIsCatOpen]     = useState(false);
  const dropdownRef                   = useRef(null);

  const [solved, setSolved]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('ff_solved_q') || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── raw list ─── */
  const rawList = useMemo(() => dsaData[dsaList] || [], [dsaList]);

  /* ── categories ─── */
  const categories = useMemo(() => {
    const cats = [...new Set(rawList.map(q => q.Category))];
    return ['All', ...cats];
  }, [rawList]);

  /* ── filtered list ─── */
  const filtered = useMemo(() => {
    return rawList.filter(q => {
      const matchSearch = search === '' ||
        q['Question Name'].toLowerCase().includes(search.toLowerCase()) ||
        q.Category.toLowerCase().includes(search.toLowerCase());
      const matchDiff  = diffFilter === 'All' || q.Difficulty === diffFilter;
      const matchCat   = catFilter  === 'All' || q.Category   === catFilter;
      return matchSearch && matchDiff && matchCat;
    });
  }, [rawList, search, diffFilter, catFilter]);

  /* ── stats ─── */
  const stats = useMemo(() => {
    const total  = rawList.length;
    const done   = rawList.filter(q => solved[`${dsaList}_${q.Id}`]).length;
    const easy   = rawList.filter(q => q.Difficulty === 'Easy').length;
    const medium = rawList.filter(q => q.Difficulty === 'Medium').length;
    const hard   = rawList.filter(q => q.Difficulty === 'Hard').length;
    return { total, done, easy, medium, hard };
  }, [rawList, solved, dsaList]);

  const toggleSolved = (id) => {
    const key = `${dsaList}_${id}`;
    setSolved(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('ff_solved_q', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="cq-page">
      {/* ── Header ── */}
      <div className="cq-header">
        <button className="cq-back-btn" onClick={onBack}>
          <ChevronLeft size={18} /> Back
        </button>
        <div className="cq-header-title">
          <h1>Coding Questions</h1>
          <p>Practice curated interview questions across categories</p>
        </div>
      </div>

      {/* ── Tab Pills ── */}
      <div className="cq-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`cq-tab-pill ${activeTab === tab.id ? 'active' : ''} ${!tab.available ? 'soon' : ''}`}
              onClick={() => tab.available && setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
              {!tab.available && <span className="cq-soon-badge">Soon</span>}
            </button>
          );
        })}
      </div>

      {/* ── DSA Content ── */}
      {activeTab === 'dsa' && (
        <div className="cq-content">
          {/* Stats bar */}
          <div className="cq-stats-bar">
            <div className="cq-stat">
              <span className="cq-stat-num">{stats.done}</span>
              <span className="cq-stat-label">Solved</span>
            </div>
            <div className="cq-stat-sep" />
            <div className="cq-stat">
              <span className="cq-stat-num">{stats.total}</span>
              <span className="cq-stat-label">Total</span>
            </div>
            <div className="cq-stat-sep" />
            <div className="cq-stat">
              <span className="cq-stat-num cq-easy">{stats.easy}</span>
              <span className="cq-stat-label">Easy</span>
            </div>
            <div className="cq-stat-sep" />
            <div className="cq-stat">
              <span className="cq-stat-num cq-medium">{stats.medium}</span>
              <span className="cq-stat-label">Medium</span>
            </div>
            <div className="cq-stat-sep" />
            <div className="cq-stat">
              <span className="cq-stat-num cq-hard">{stats.hard}</span>
              <span className="cq-stat-label">Hard</span>
            </div>
            {/* Progress bar */}
            <div className="cq-progress-wrap">
              <div
                className="cq-progress-fill"
                style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="cq-filters">
            <div className="cq-search-wrap">
              <Search size={14} className="cq-search-icon" />
              <input
                className="cq-search"
                placeholder="Search questions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="cq-search-clear" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="cq-filter-group">
              <Filter size={13} />
              {['All','Easy','Medium','Hard'].map(d => (
                <button
                  key={d}
                  className={`cq-filter-pill ${diffFilter === d ? 'active diff-'+d.toLowerCase() : ''}`}
                  onClick={() => setDiffFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="cq-custom-select-wrap" ref={dropdownRef}>
              <button
                className={`cq-cat-select ${isCatOpen ? 'open' : ''}`}
                onClick={() => setIsCatOpen(!isCatOpen)}
              >
                {catFilter} <ChevronDown size={14} />
              </button>
              {isCatOpen && (
                <div className="cq-cat-dropdown">
                  {categories.map(c => (
                    <button
                      key={c}
                      className={`cq-cat-option ${catFilter === c ? 'active' : ''}`}
                      onClick={() => { setCatFilter(c); setIsCatOpen(false); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="cq-table-wrap">
            <table className="cq-table">
              <thead>
                <tr>
                  <th style={{width:'44px'}}>#</th>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th style={{width:'60px'}}>Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="cq-empty">No questions match your filters.</td>
                  </tr>
                ) : filtered.map(q => {
                  const isSolved = solved[`${dsaList}_${q.Id}`];
                  return (
                    <tr
                      key={q.Id}
                      className={`cq-row ${isSolved ? 'cq-row-solved' : ''}`}
                    >
                      <td className="cq-num">
                        <button
                          className="cq-check-btn"
                          onClick={() => toggleSolved(q.Id)}
                          title={isSolved ? 'Mark unsolved' : 'Mark solved'}
                        >
                          {isSolved
                            ? <CheckCircle2 size={16} className="cq-check-done" />
                            : <Circle size={16} className="cq-check-todo" />
                          }
                        </button>
                      </td>
                      <td className="cq-name">{q['Question Name']}</td>
                      <td className="cq-cat">
                        <span
                          className="cq-cat-tag"
                          style={{ '--cat-color': catColor(q.Category) }}
                        >
                          {q.Category}
                        </span>
                      </td>
                      <td><DiffPill difficulty={q.Difficulty} /></td>
                      <td>
                        <a
                          href={q['External Link']}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cq-link-btn"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="cq-count">{filtered.length} of {stats.total} questions</p>
        </div>
      )}

      {/* ── Coming Soon tabs ── */}
      {activeTab !== 'dsa' && (
        <div className="cq-coming-soon">
          <BrainCircuit size={48} strokeWidth={1} />
          <h2>Coming Soon</h2>
          <p>This question bank is being curated. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
