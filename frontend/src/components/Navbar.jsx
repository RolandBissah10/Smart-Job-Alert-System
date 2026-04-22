import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, UserPlus, LogIn, LayoutDashboard, Menu, X } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <header className="navbar">
      <div className="brand">Smart Job Alert</div>
      <div className="navbar-controls">
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          type="button"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <DarkModeToggle />
      </div>

      <nav className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>
          <Home size={18} />
          Home
        </NavLink>
        {!isLoggedIn && (
          <NavLink to="/signup" onClick={() => setMenuOpen(false)}>
            <UserPlus size={18} />
            Signup
          </NavLink>
        )}
        {!isLoggedIn && (
          <NavLink to="/login" onClick={() => setMenuOpen(false)}>
            <LogIn size={18} />
            Login
          </NavLink>
        )}
        {isLoggedIn && (
          <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
        )}
        <DarkModeToggle />
      </nav>
    </header>
  );
}
