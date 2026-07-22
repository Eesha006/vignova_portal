import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Bell, Search, ChevronDown, X, MessageSquare, TicketCheck,
  CheckSquare, Package, Video, Receipt, FolderKanban,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  messageAPI, ticketAPI, approvalAPI, deliverableAPI,
  invoiceAPI, projectAPI, meetingAPI, calendarAPI
} from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const SEEN_KEY = 'vignova_seen_notif_ids';
const SEEN_MSG_KEY = 'vignova_seen_msg_count';

const getSeenIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
};

const saveSeenIds = (set) => {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
};

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newCount, setNewCount] = useState(0);       // bell badge — only NEW items
  const [msgUnread, setMsgUnread] = useState(0);     // sidebar badge — unread messages
  const dropdownRef = useRef(null);
  const seenIdsRef = useRef(getSeenIds());
  const prevIdsRef = useRef(new Set());              // IDs from previous fetch

  // ── Clear message badge when user visits /messages ─────────────────────
  useEffect(() => {
    if (location.pathname === '/messages') {
      setMsgUnread(0);
      localStorage.setItem(SEEN_MSG_KEY, Date.now().toString());
    }
  }, [location.pathname]);

  // ── Build notifications from all APIs ──────────────────────────────────
  const fetchAll = useCallback(async () => {
    const notifs = [];

    try {
      const res = await messageAPI.getAll();
      const lastSeen = parseInt(localStorage.getItem(SEEN_MSG_KEY) || '0');
      const unread = (res.data || []).filter(
        m => !m.read &&
          m.receiver?.email === user?.email &&
          new Date(m.createdAt).getTime() > lastSeen
      );
      setMsgUnread(unread.length);
      unread.slice(0, 5).forEach(m => notifs.push({
        id: `msg-${m.id}`,
        icon: MessageSquare, color: '#1E88E5', bg: '#E3F2FD',
        title: `New message from ${m.sender?.fullName || 'Team'}`,
        body: m.content?.slice(0, 60) + (m.content?.length > 60 ? '...' : ''),
        time: m.createdAt, route: '/messages',
      }));
    } catch {}

    try {
      const res = await ticketAPI.getAll();
      (res.data || [])
        .filter(t => t.status === 'RESOLVED' || t.status === 'IN_PROGRESS')
        .slice(0, 3).forEach(t => notifs.push({
          id: `ticket-${t.id}-${t.status}`,
          icon: TicketCheck,
          color: t.status === 'RESOLVED' ? '#43A047' : '#1E88E5',
          bg: t.status === 'RESOLVED' ? '#E8F5E9' : '#E3F2FD',
          title: `Ticket ${t.status === 'RESOLVED' ? 'Resolved ✓' : 'Updated'}: ${t.subject}`,
          body: t.adminResponse || `Status: ${t.status}`,
          time: t.updatedAt || t.createdAt, route: '/tickets',
        }));
    } catch {}

    try {
      const res = await approvalAPI.getAll();
      (res.data || [])
        .filter(a => a.status === 'APPROVED' || a.status === 'CHANGES_REQUESTED' || a.status === 'PENDING')
        .slice(0, 4).forEach(a => notifs.push({
          id: `approval-${a.id}-${a.status}`,
          icon: CheckSquare,
          color: a.status === 'APPROVED' ? '#43A047' : a.status === 'PENDING' ? '#F4B400' : '#E53935',
          bg: a.status === 'APPROVED' ? '#E8F5E9' : a.status === 'PENDING' ? '#FFF8E1' : '#FFEBEE',
          title: a.status === 'APPROVED'
            ? `✓ Approved: ${a.title}`
            : a.status === 'CHANGES_REQUESTED'
            ? `Changes Requested: ${a.title}`
            : `Approval Pending: ${a.title}`,
          body: a.feedback || a.client?.fullName || '',
          time: a.updatedAt || a.createdAt, route: '/approvals',
        }));
    } catch {}

    try {
      const res = await deliverableAPI.getAll();
      (res.data || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 4).forEach(d => notifs.push({
          id: `deliv-${d.id}`,
          icon: Package, color: '#1565C0', bg: '#E3F2FD',
          title: `📁 New file: ${d.name}`,
          body: `${d.category || ''} · ${d.client?.fullName || ''} · ${d.monthYear || ''}`,
          time: d.createdAt, route: '/deliverables',
        }));
    } catch {}

    try {
      const res = await invoiceAPI.getAll();
      (res.data || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3).forEach(inv => notifs.push({
          id: `invoice-${inv.id}-${inv.status}`,
          icon: Receipt,
          color: inv.status === 'PAID' ? '#43A047' : inv.status === 'OVERDUE' ? '#E53935' : '#F4B400',
          bg: inv.status === 'PAID' ? '#E8F5E9' : inv.status === 'OVERDUE' ? '#FFEBEE' : '#FFF8E1',
          title: inv.status === 'PAID'
            ? `✓ Invoice Paid: ${inv.invoiceNumber}`
            : inv.status === 'OVERDUE'
            ? `⚠ Overdue: ${inv.invoiceNumber}`
            : `Invoice Due: ${inv.invoiceNumber}`,
          body: `₹${Number(inv.amount).toLocaleString('en-IN')} · ${inv.client?.fullName || ''}`,
          time: inv.createdAt, route: '/invoices',
        }));
    } catch {}

    try {
      const res = await projectAPI.getAll();
      (res.data || [])
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 3).forEach(p => notifs.push({
          id: `project-${p.id}-${p.progressPercent}-${p.status}`,
          icon: FolderKanban,
          color: p.status === 'COMPLETED' ? '#43A047' : p.status === 'DELAYED' ? '#E53935' : '#1E88E5',
          bg: p.status === 'COMPLETED' ? '#E8F5E9' : p.status === 'DELAYED' ? '#FFEBEE' : '#E3F2FD',
          title: p.status === 'COMPLETED'
            ? `✓ Completed: ${p.name}`
            : p.status === 'DELAYED'
            ? `⚠ Delayed: ${p.name}`
            : `Project Updated: ${p.name}`,
          body: `${p.progressPercent}% · ${p.client?.fullName || ''}`,
          time: p.updatedAt || p.createdAt, route: '/projects',
        }));
    } catch {}

    try {
      const res = await meetingAPI.getAll();
      (res.data || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3).forEach(m => notifs.push({
          id: `meeting-${m.id}-${m.status}`,
          icon: Video,
          color: m.status === 'SCHEDULED' ? '#43A047' : m.status === 'CANCELLED' ? '#E53935' : '#1E88E5',
          bg: m.status === 'SCHEDULED' ? '#E8F5E9' : m.status === 'CANCELLED' ? '#FFEBEE' : '#E3F2FD',
          title: m.status === 'SCHEDULED'
            ? `📅 Meeting Scheduled: ${m.subject}`
            : m.status === 'CANCELLED'
            ? `❌ Meeting Cancelled: ${m.subject}`
            : `Meeting Request: ${m.subject}`,
          body: m.scheduledStart
            ? new Date(m.scheduledStart).toLocaleString('en-IN')
            : m.client?.fullName || '',
          time: m.createdAt, route: '/meetings',
        }));
    } catch {}

    try {
      const res = await calendarAPI.getAll();
      (res.data || [])
        .sort((a, b) => new Date(b.createdAt || b.scheduledDate) - new Date(a.createdAt || a.scheduledDate))
        .slice(0, 3).forEach(c => notifs.push({
          id: `cal-${c.id}-${c.status}`,
          icon: CalendarDays,
          color: c.status === 'PUBLISHED' ? '#43A047' : '#F4B400',
          bg: c.status === 'PUBLISHED' ? '#E8F5E9' : '#FFF8E1',
          title: `${c.status === 'PUBLISHED' ? '✓ Published' : '📅 Scheduled'}: ${c.title}`,
          body: `${c.contentType} · ${c.platform || ''} · ${c.client?.fullName || ''}`,
          time: c.createdAt || c.scheduledDate, route: '/calendar',
        }));
    } catch {}

    // Deduplicate + sort
    const unique = Array.from(new Map(notifs.map(n => [n.id, n])).values())
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

    // Mark which ones are new (not seen before)
    const currentIds = new Set(unique.map(n => n.id));
    const genuinelyNew = [...currentIds].filter(id => !seenIdsRef.current.has(id));

    // Only count NEW ones as unread for bell badge
    const withReadFlag = unique.map(n => ({
      ...n,
      isNew: !seenIdsRef.current.has(n.id),
    }));

    setNotifications(withReadFlag);
    setNewCount(genuinelyNew.length);
    prevIdsRef.current = currentIds;
  }, [user]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When bell is opened — mark all as seen, reset badge to 0
  const openNotifications = () => {
    if (!showNotif) {
      // Mark everything currently shown as seen
      notifications.forEach(n => seenIdsRef.current.add(n.id));
      saveSeenIds(seenIdsRef.current);
      setNewCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
    }
    setShowNotif(v => !v);
  };

  const handleNotifClick = (notif) => {
    seenIdsRef.current.add(notif.id);
    saveSeenIds(seenIdsRef.current);
    setShowNotif(false);
    navigate(notif.route);
  };

  const clearAll = () => {
    notifications.forEach(n => seenIdsRef.current.add(n.id));
    saveSeenIds(seenIdsRef.current);
    setNotifications([]);
    setNewCount(0);
  };

  const initials = user?.fullName
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="header">
      <div className="header-search">
        <Search size={15} />
        <input placeholder="Search anything..." />
      </div>

      <div className="header-actions">

        {/* Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="header-btn" onClick={openNotifications}>
            <Bell size={17} />
            {/* Only show badge when there are genuinely NEW unseen notifications */}
            {newCount > 0 && (
              <span className="badge">{newCount > 99 ? '99+' : newCount}</span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', top: 46, right: 0,
              width: 400, background: 'white',
              borderRadius: 16, border: '1px solid #E5E7EB',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              zIndex: 999, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Plus Jakarta Sans' }}>Notifications</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                    {notifications.length} total
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {notifications.length > 0 && (
                    <button onClick={clearAll}
                      style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setShowNotif(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <Bell size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.15 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      You're all caught up!
                    </div>
                    <div style={{ fontSize: 13, color: '#9CA3AF' }}>No notifications</div>
                  </div>
                ) : notifications.map(n => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '13px 18px',
                        borderBottom: '1px solid #F9FAFB',
                        cursor: 'pointer',
                        background: n.isNew ? '#F8FBFF' : 'white',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                      onMouseLeave={e => e.currentTarget.style.background = n.isNew ? '#F8FBFF' : 'white'}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={17} color={n.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: n.isNew ? 700 : 500, color: '#1F2937', marginBottom: 2, lineHeight: 1.4 }}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.body}
                          </div>
                        )}
                        {n.time && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                            {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                      {/* Blue dot only for new items */}
                      {n.isNew && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1E88E5', flexShrink: 0, marginTop: 5 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {notifications.length > 0 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{notifications.length} notifications</span>
                  <button onClick={() => { setShowNotif(false); navigate('/messages'); }}
                    style={{ fontSize: 13, color: '#1E88E5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    View messages →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="user-menu">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <strong>{user?.fullName}</strong>
            <span>
              {user?.role === 'ADMIN' ? 'Admin'
                : user?.role === 'TEAM_MEMBER' ? 'Team Member'
                : 'Client'}
            </span>
          </div>
          <ChevronDown size={14} color="#6B7280" />
        </div>
      </div>
    </header>
  );
}