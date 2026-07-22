import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';
import {
  LayoutDashboard, Briefcase, FolderKanban, CalendarDays,
  BarChart3, Receipt, Package, CheckSquare, MessageSquare,
  Video, Boxes, TicketCheck, Settings, Users, LogOut, UsersRound
} from 'lucide-react';

const SEEN_MSG_KEY = 'vignova_seen_msg_count';

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/services', icon: Briefcase, label: 'Services' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Content Calendar' },
  { to: '/reports', icon: BarChart3, label: 'Performance Reports' },
  { to: '/invoices', icon: Receipt, label: 'Bills & Invoices' },
  { to: '/deliverables', icon: Package, label: 'Deliverables' },
  { to: '/approvals', icon: CheckSquare, label: 'Approval Center' },
  { to: '/messages', icon: MessageSquare, label: 'Communication', badge: true },
  { to: '/meetings', icon: Video, label: 'Quick Meet-Up' },
  { to: '/brand-assets', icon: Boxes, label: 'Brand Assets' },
  { to: '/tickets', icon: TicketCheck, label: 'Support Tickets' },
  { to: '/profile', icon: Settings, label: 'Profile Settings' },
];

const teamMemberNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/services', icon: Briefcase, label: 'Services' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/deliverables', icon: Package, label: 'Deliverables' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/messages', icon: MessageSquare, label: 'Communication', badge: true },
  { to: '/meetings', icon: Video, label: 'My Meetings' },
  { to: '/tickets', icon: TicketCheck, label: 'Support Tickets' },
  { to: '/profile', icon: Settings, label: 'Profile Settings' },
  { to: '/brand-assets', icon: Boxes, label: 'Brand Assets' },
];

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/services', icon: Briefcase, label: 'Services' },
  { to: '/admin/clients', icon: Users, label: 'Manage Clients' },
  { to: '/admin/team', icon: UsersRound, label: 'Team Management' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/calendar', icon: CalendarDays, label: 'Content Calendar' },
  { to: '/deliverables', icon: Package, label: 'Deliverables' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/messages', icon: MessageSquare, label: 'Messages', badge: true },
  { to: '/meetings', icon: Video, label: 'Meetings' },
  { to: '/tickets', icon: TicketCheck, label: 'Support Tickets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/profile', icon: Settings, label: 'Profile Settings' },
  { to: '/brand-assets', icon: Boxes, label: 'Brand Assets' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [msgCount, setMsgCount] = useState(0);

  const nav = user?.role === 'ADMIN' ? adminNav
    : user?.role === 'TEAM_MEMBER' ? teamMemberNav
    : clientNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  const fetchMsgCount = async () => {
    // If user is on messages page — no badge needed
    if (location.pathname === '/messages') {
      setMsgCount(0);
      return;
    }
    try {
      const res = await messageAPI.getAll();
      const lastSeen = parseInt(localStorage.getItem(SEEN_MSG_KEY) || '0');
      // Only count messages received AFTER the last time user visited /messages
      const newMsgs = (res.data || []).filter(m =>
        !m.read &&
        m.receiver?.email === user?.email &&
        new Date(m.createdAt).getTime() > lastSeen
      );
      setMsgCount(newMsgs.length);
    } catch {
      setMsgCount(0);
    }
  };

  useEffect(() => {
    fetchMsgCount();
    const interval = setInterval(fetchMsgCount, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">V</div>
          <div className="logo-text">
            <strong>VIGNOVA</strong>
            <span>ELEVATE · ENGAGE · EMPOWER</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (to === '/messages') {
                // Mark messages as seen right now
                localStorage.setItem(SEEN_MSG_KEY, Date.now().toString());
                setMsgCount(0);
              }
            }}
          >
            <Icon className="nav-icon" />
            <span style={{ flex: 1 }}>{label}</span>
            {/* Only show badge when there are NEW unread messages */}
            {badge && msgCount > 0 && (
              <span style={{
                background: '#E53935',
                color: 'white',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 99,
                lineHeight: 1.4,
                flexShrink: 0,
                minWidth: 18,
                textAlign: 'center',
              }}>
                {msgCount > 99 ? '99+' : msgCount}
              </span>
            )}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ background: 'none', border: 'none', width: '100%', color: '#E53935', marginTop: 8 }}
        >
          <LogOut className="nav-icon" />
          Sign Out
        </button>
      </nav>

      <div className="sidebar-help">
        <h4>Need Help?</h4>
        <p>We're here to assist you.</p>
        <button className="help-btn" onClick={() => navigate('/tickets')}>
          Contact Support
        </button>
      </div>
    </aside>
  );
}