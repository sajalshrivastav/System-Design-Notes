import React from 'react';
import { 
  Home, 
  Compass
} from 'lucide-react';

export default function Sidebar({
  activeDayNum,
  onDayChange,
  isOpen
}) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, active: activeDayNum === null },
    { id: 'dashboard', label: 'Explore Tracks', icon: Compass, active: activeDayNum === -1 },
  ];

  return (
    <aside className={`modern-sidebar notion-style ${!isOpen ? 'collapsed' : ''}`}>
      {/* ── Static Sidebar Brand ── */ }
      <div className="sidebar-brand-static">
        <div className="brand-icon-notion">
          <div className="brand-dot-notion" />
        </div>
        <div className="workspace-info">
          <span className="brand-name-notion">FrontendForge</span>
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="sidebar-nav-notion">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-btn-notion ${item.active ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'home') onDayChange(null);
                else if (item.id === 'dashboard') onDayChange(-1);
              }}
            >
              <Icon size={18} className="nav-icon-notion" />
              <span className="nav-btn-label-notion">{item.label}</span>
              {item.active && <div className="active-glow-notion" />}
            </button>
          );
        })}
      </nav>

      {/* Utilities/Footer removed as requested */}
    </aside>
  );
}
