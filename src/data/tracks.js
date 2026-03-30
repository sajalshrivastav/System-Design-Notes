// Multi-track curriculum data
// system-design uses notes.json (fetched dynamically)
// Other tracks show "under progress" placeholder

export const TRACKS = [
  {
    id: 'javascript',
    label: 'JavaScript',
    icon: 'FileJson',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.18)',
    description: 'Deep JS internals, closures, async patterns',
    available: false,
  },
  {
    id: 'js-patterns',
    label: 'JS Patterns',
    icon: 'Terminal',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.18)',
    description: 'Singleton, Proxy, Observer & common JS design patterns',
    available: true,
  },
  {
    id: 'react',
    label: 'React',
    icon: 'Atom',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.18)',
    description: 'Hooks, patterns, performance, architecture',
    available: false,
  },
  {
    id: 'angular',
    label: 'Angular',
    icon: 'Hexagon',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.18)',
    description: 'Modules, DI, RxJS, enterprise patterns',
    available: false,
  },
  {
    id: 'system-design',
    label: 'System Design',
    icon: 'Command',
    color: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.18)',
    description: 'Frontend architecture, performance & scalability',
    available: true,
  },
];
