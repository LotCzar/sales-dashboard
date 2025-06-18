import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaChartBar, FaFileInvoice, FaStore, FaUsers } from 'react-icons/fa';

function MobileNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: <FaHome /> },
    { path: '/reports', label: 'Reports', icon: <FaChartBar /> },
    { path: '/invoices', label: 'Invoices', icon: <FaFileInvoice /> },
    { path: '/stores', label: 'Stores', icon: <FaStore /> },
    { path: '/reps', label: 'Reps', icon: <FaUsers /> }
  ];

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            end={item.path === '/'}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav; 