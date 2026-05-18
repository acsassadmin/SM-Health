import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND } from '../../utils/brand';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { section: 'Main', items: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'staff', label: 'Staff Directory', icon: '👥' },
    ]},
    { section: 'Scheduling', items: [
      { id: 'shifts', label: 'Shifts', icon: '📋' },
      { id: 'rota', label: 'Rota Calendar', icon: '📅' },
    ]}
  ];

  return (
    <nav id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
           <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
             <rect x="9" y="3" width="4" height="16" rx="1.5" fill="#fff"/>
             <rect x="3" y="9" width="16" height="4" rx="1.5" fill="#fff"/>
           </svg>
        </div>
        <div className="logo-text">
          <div className="brand">{BRAND.name}</div>
          <div className="sub">{BRAND.tagline.toUpperCase()}</div>
        </div>
      </div>

      {navItems.map((group) => (
        <div key={group.section}>
          <div className="sidebar-section">{group.section}</div>
          {group.items.map((item) => {
            const isActive = location.pathname === (item.id === 'dashboard' ? '/' : `/${item.id}`);
            return (
              <div 
                key={item.id} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.id === 'dashboard' ? '/' : `/${item.id}`)}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default Sidebar;