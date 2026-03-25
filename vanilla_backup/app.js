const weeks = [
  {
    week: 1,
    label: "Foundations",
    days: [
      { day: 1, title: "How the Web Works",       file: "Week 1/Day-1.md", stars: 5, difficulty: "Beginner",                time: "1 hr" },
      { day: 2, title: "JavaScript Event Loop",   file: "Week 1/Day-2.md", stars: 5, difficulty: "Beginner → Intermediate", time: "1 hr" },
      { day: 3, title: "Browser Storage",         file: "Week 1/Day-3.md", stars: 5, difficulty: "Beginner → Intermediate", time: "1 hr" },
      { day: 4, title: "Core Web Vitals",         file: "Week 1/Day-4.md", stars: 5, difficulty: "Intermediate",           time: "1 hr" },
      { day: 5, title: "HTTP Caching",            file: "Week 1/Day-5.md", stars: 4, difficulty: "Intermediate",           time: "1.5 hr" },
      { day: 6, title: "Browser Rendering",       file: "Week 1/Day-6.md", stars: 4, difficulty: "Intermediate",           time: "1.5 hr" },
      { day: 7, title: "Security Fundamentals",   file: "Week 1/Day-7.md", stars: 5, difficulty: "Intermediate → Advanced", time: "2 hr" },
      { day: 8, title: "Phase 1 Review",          file: "Week 1/Day-8.md", stars: 5, difficulty: "Review",                 time: "1 hr" },
    ]
  },
  {
    week: 2,
    label: "Deep Dive",
    days: [
      { day: 9, title: "Advanced Topics",         file: "Week 2/Day-9.md", stars: 4, difficulty: "Intermediate",           time: "1 hr" },
    ]
  }
];

// Flat notes array for quick lookups
const allNotes = weeks.flatMap(w => w.days.map(d => ({ ...d, week: w.week })));

// Navbar pills — one per week (to switch context)
function buildNavbar() {
  const container = document.getElementById('nav-pills');
  weeks.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'nav-pill';
    btn.textContent = `Week ${w.week}`;
    btn.dataset.week = w.week;
    btn.onclick = () => buildDayList(w.week);
    container.appendChild(btn);
  });
  // Initially show week 1 in sidebar
  if (weeks.length > 0) buildDayList(weeks[0].week);
}

// Sidebar day list — filters by week
function buildDayList(weekNum) {
  const list = document.getElementById('day-list');
  list.innerHTML = ''; // clear old list
  
  const week = weeks.find(w => w.week === weekNum);
  if (!week) return;

  // Update sidebar header label
  const label = document.querySelector('.week-label');
  if (label) label.textContent = `Week ${week.week} — ${week.label}`;

  // Set active week pill
  document.querySelectorAll('.nav-pill').forEach(b => 
    b.classList.toggle('active', parseInt(b.dataset.week) === weekNum)
  );

  week.days.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'day-btn';
    btn.dataset.day = note.day;
    btn.dataset.week = weekNum;
    btn.onclick = () => loadNote(weekNum, note.day);
    btn.innerHTML = `
      <span class="day-num">Day ${note.day}</span>
      <div class="day-meta">
        <div class="day-title">${note.title}</div>
        <div class="day-stars">${'★'.repeat(note.stars)}</div>
      </div>
    `;
    list.appendChild(btn);
  });
}

function setActive(week, day) {
  document.querySelectorAll('.day-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.day) === day && parseInt(b.dataset.week) === week));
}

// Configure marked
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

async function loadNote(weekNum, day) {
  const note = allNotes.find(n => n.week === weekNum && n.day === day);
  if (!note) return;

  setActive(weekNum, day);

  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div> Loading week ${weekNum} day ${day}...</div>`;

  try {
    const res = await fetch(note.file);
    if (!res.ok) throw new Error('Not found');
    const md = await res.text();

    const lines = md.split('\n');
    let bodyStart = 0;
    let passedH1 = false, passedMeta = false, passedHr = false;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!passedH1 && l.startsWith('# ')) { passedH1 = true; bodyStart = i + 1; continue; }
      if (passedH1 && !passedMeta && (l.startsWith('## Topic:') || l.startsWith('> '))) { bodyStart = i + 1; continue; }
      if (passedH1 && !passedHr && l === '---') { passedHr = true; bodyStart = i + 1; break; }
    }

    const body = lines.slice(bodyStart).join('\n');
    const html = (typeof marked !== 'undefined') ? marked.parse(body) : `<pre>${body}</pre>`;

    content.innerHTML = `
      <div class="page-meta">
        <span class="meta-tag week">Week ${weekNum} · Day ${note.day}</span>
        <span class="meta-tag time">⏱ ${note.time}</span>
        <span class="meta-tag diff">${note.difficulty}</span>
      </div>
      <h1>${note.title}</h1>
      <hr style="margin: 20px 0 32px; border-color: #2a2a2a;" />
      <div class="markdown-body">${html}</div>
    `;

    // Syntax highlight if available
    if (typeof hljs !== 'undefined') {
      content.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (e) {
    console.error(e);
    content.innerHTML = `<div class="loading" style="color:#e06c75">Could not load note: ${note.file}. Make sure the file exists.</div>`;
  }
}

buildNavbar();

