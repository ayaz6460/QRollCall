import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, QrCode, Users, AlertTriangle, Bell,
  BarChart2, UserCircle, LogOut, ScanLine, CheckSquare, Shield
} from 'lucide-react';

const studentNav = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/student' },
  { icon: ScanLine,        label: 'Scan QR',    path: '/scanner' },
  { icon: BarChart2,       label: 'Analytics',  path: '/analytics' },
  { icon: Bell,            label: 'Notifications', path: '/notifications' },
];

const adminNav = [
  { icon: LayoutDashboard, label: 'Overview',       path: '/admin' },
  { icon: Users,           label: 'Teachers',       path: '/admin/teachers' },
  { icon: UserCircle,      label: 'Students',       path: '/admin/students' },
  { icon: QrCode,          label: 'Sessions',       path: '/admin/sessions' },
  { icon: CheckSquare,     label: 'Attendance',     path: '/admin/attendance' },
  { icon: Shield,          label: 'Fraud Alerts',   path: '/fraud' },
  { icon: Bell,            label: 'Communications', path: '/admin/comms' },
  { icon: Shield,          label: 'Admins',         path: '/admin/admins' },
];

const teacherNav = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/teacher' },
  { icon: QrCode,          label: 'Show QR',       path: '/qr-display' },
  { icon: CheckSquare,     label: 'Live Class',    path: '/live-attendance' },
  { icon: Shield,          label: 'Fraud Alerts',  path: '/fraud' },
  { icon: Users,           label: 'Students',      path: '/students' },
  { icon: BarChart2,       label: 'Analytics',     path: '/analytics' },
  { icon: Bell,            label: 'Notifications', path: '/notifications' },
];

export default function Sidebar({ role = 'student', userName = 'Arjun Sharma', onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    if (typeof onLogout === 'function') onLogout();
    else logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">Q</div>
        <span className="logo-text">QR<span>oll</span>Call</span>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-title">Menu</p>
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = path === '/admin' 
            ? location.pathname === '/admin' 
            : location.pathname.startsWith(path);
          return (
            <div
              key={path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={17} className="nav-icon" />
              {label}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <p className="user-name">{userName}</p>
            <p className="user-role" style={{ textTransform: 'capitalize' }}>{role}</p>
          </div>
        </div>
        <div
          className="nav-item mt-8"
          style={{ color: 'var(--danger)' }}
          onClick={handleSignOut}
        >
          <LogOut size={17} />
          Sign Out
        </div>
      </div>
    </aside>
  );
}
