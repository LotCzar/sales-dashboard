import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function MobileNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/invoices', label: 'Invoices', icon: '📄' },
    { path: '/stores', label: 'Stores', icon: '🏪' },
    { path: '/reps', label: 'Reps', icon: '👥' }
  ];

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav; 