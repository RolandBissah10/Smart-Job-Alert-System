import { NavLink } from 'react-router-dom';
import { Home, UserPlus, LogIn, LayoutDashboard } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="brand">Smart Job Alert</div>
      <nav>
        <NavLink to="/" end>
          <Home size={18} />
          Home
        </NavLink>
        <NavLink to="/signup">
          <UserPlus size={18} />
          Signup
        </NavLink>
        <NavLink to="/login">
          <LogIn size={18} />
          Login
        </NavLink>
        <NavLink to="/dashboard">
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <DarkModeToggle />
      </nav>
    </header>
  );
}
