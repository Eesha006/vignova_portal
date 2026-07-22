import React, { useEffect, useState } from 'react';
import { calendarAPI, adminAPI, teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, getDay
} from 'date-fns';

const typeColors = {
  REEL:     { bg: '#E3F2FD', color: '#1E88E5' },
  POST:     { bg: '#E8F5E9', color: '#43A047' },
  CAROUSEL: { bg: '#FFF8E1', color: '#F4B400' },
  AD:       { bg: '#FFEBEE', color: '#E53935' },
  BLOG:     { bg: '#F3E8FF', color: '#7C3AED' },
  VIDEO:    { bg: '#E0F7FA', color: '#00838F' },
};

export default function ContentCalendarPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [allClients, setAllClients] = useState([]);   // admin: all clients
  const [assignedClients, setAssignedClients] = useState([]); // team member: assigned clients
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState('All');
  const [form, setForm] = useState({
    title: '', description: '', contentType: 'POST',
    status: 'SCHEDULED', platform: '', scheduledDate: '', clientId: '',
  });

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const canEdit = isAdmin || isTeamMember;

  const load = () => {
    calendarAPI.getAll()
      .then(r => setEntries(r.data || []))
      .catch(() => toast.error('Failed to load calendar'));
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      adminAPI.getClients()
        .then(r => setAllClients(r.data || []))
        .catch(() => {});
    }
    if (isTeamMember) {
      // Get assignments to know which clients this team member has
      teamAPI.getAssignments()
        .then(r => {
          // Filter assignments for this team member by checking email match
          // Backend already filters by team member in getCalendar
          // But we need client list for the modal dropdown
          // We'll derive from calendar entries after load
        })
        .catch(() => {});
    }
  }, []);

  // Derive assigned clients from calendar entries for team member
  useEffect(() => {
    if (isTeamMember && entries.length > 0) {
      const clientMap = new Map();
      entries.forEach(e => {
        if (e.client) clientMap.set(e.client.id, e.client);
      });
      setAssignedClients([...clientMap.values()]);
    }
  }, [entries, isTeamMember]);

  // Clients available for dropdown in modal
  const modalClients = isAdmin ? allClients : assignedClients;

  // Clients available for filter tabs
  const filterClients = isAdmin
    ? [...new Map(entries.filter(e => e.client).map(e => [e.client.id, e.client])).values()]
    : assignedClients;

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPad = getDay(startOfMonth(currentMonth));

  const filteredEntries = selectedClientFilter === 'All'
    ? entries
    : entries.filter(e => e.client?.id?.toString() === selectedClientFilter);

  const entriesForDay = (day) =>
    filteredEntries.filter(e =>
      e.scheduledDate && isSameDay(new Date(e.scheduledDate), day));

  const openNew = (day = null) => {
    setEditing(null);
    const defaultClient = modalClients.length > 0 ? modalClients[0].id : '';
    setForm({
      title: '', description: '',
      contentType: 'POST', status: 'SCHEDULED',
      platform: 'Instagram',
      scheduledDate: day ? format(day, "yyyy-MM-dd'T'HH:mm") : '',
      clientId: defaultClient,
    });
    setShowModal(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description || '',
      contentType: e.contentType,
      status: e.status,
      platform: e.platform || '',
      scheduledDate: e.scheduledDate ? e.scheduledDate.substring(0, 16) : '',
      clientId: e.client?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.clientId) { toast.error('Please select a client'); return; }
    try {
      const payload = {
        title: form.title,
        description: form.description,
        contentType: form.contentType,
        status: form.status,
        platform: form.platform,
        scheduledDate: form.scheduledDate || null,
        client: { id: parseInt(form.clientId) },
      };
      if (editing) await calendarAPI.update(editing.id, payload);
      else await calendarAPI.create(payload);
      toast.success(editing ? 'Updated!' : 'Event created!');
      setShowModal(false);
      load();
    } catch (err) {
      const msg = err.response?.data || 'Failed to save';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await calendarAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      const msg = err.response?.data || 'Failed to delete';
      toast.error(typeof msg === 'string' ? msg : 'Failed to delete');
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Content Calendar</div>
          <div className="page-subtitle">
            {isAdmin
              ? 'All client content schedules — add, edit, delete for any client'
              : isTeamMember
              ? 'Content schedules for your assigned clients — you can add, edit, delete'
              : 'Scheduled posts, reels, and campaigns'}
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => openNew()}>
            <Plus size={16} />Add Event
          </button>
        )}
      </div>

      {/* Team member info banner */}
      {isTeamMember && assignedClients.length > 0 && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>
            Managing calendars for:&nbsp;
            <strong>{assignedClients.map(c => c.fullName).join(', ')}</strong>
          </span>
        </div>
      )}

      {isTeamMember && assignedClients.length === 0 && entries.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#92400E' }}>
          No assigned clients yet. Ask your admin to assign clients to you.
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(typeColors).map(([type, { bg, color }]) => (
          <span key={type} style={{ padding: '4px 12px', background: bg, color, borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
            {type}
          </span>
        ))}
      </div>

      {/* Client filter tabs — admin and team member */}
      {(isAdmin || isTeamMember) && filterClients.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          <button
            onClick={() => setSelectedClientFilter('All')}
            style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: selectedClientFilter === 'All' ? '#1E88E5' : 'white', color: selectedClientFilter === 'All' ? 'white' : '#374151', borderColor: selectedClientFilter === 'All' ? '#1E88E5' : '#E5E7EB' }}>
            All Clients
          </button>
          {filterClients.map(c => (
            <button key={c.id}
              onClick={() => setSelectedClientFilter(c.id.toString())}
              style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: selectedClientFilter === c.id.toString() ? '#1E88E5' : 'white', color: selectedClientFilter === c.id.toString() ? 'white' : '#374151', borderColor: selectedClientFilter === c.id.toString() ? '#1E88E5' : '#E5E7EB' }}>
              {c.fullName}
            </button>
          ))}
        </div>
      )}

      {/* Calendar card */}
      <div className="card">
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <button className="btn btn-icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Plus Jakarta Sans' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <button className="btn btn-icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6B7280', letterSpacing: 0.5 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderLeft: '1px solid #F3F4F6' }}>
          {/* Padding */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} style={{ minHeight: 110, borderRight: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }} />
          ))}
          {/* Days */}
          {days.map((day, i) => {
            const dayEntries = entriesForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={i}
                style={{ minHeight: 110, padding: 6, borderRight: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', cursor: canEdit ? 'pointer' : 'default' }}
                onClick={() => canEdit && openNew(day)}
              >
                <div style={{ fontWeight: isToday ? 800 : 500, fontSize: 13, color: isToday ? 'white' : '#374151', background: isToday ? '#1E88E5' : 'transparent', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  {format(day, 'd')}
                </div>
                {dayEntries.map(e => {
                  const tc = typeColors[e.contentType] || typeColors.POST;
                  return (
                    <div key={e.id}
                      style={{ padding: '2px 6px', background: tc.bg, color: tc.color, borderRadius: 5, fontSize: 10, fontWeight: 600, marginBottom: 3, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={(ev) => { ev.stopPropagation(); canEdit && openEdit(e); }}
                      title={`${e.title} — ${e.client?.fullName || ''} — ${e.platform || ''}`}
                    >
                      {e.client ? `[${e.client.fullName?.split(' ')[0]}] ` : ''}{e.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* List view */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-header">
          <div className="card-title">
            All Scheduled Content
            {selectedClientFilter !== 'All' && (
              <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', marginLeft: 8 }}>
                — {filterClients.find(c => c.id.toString() === selectedClientFilter)?.fullName}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>{filteredEntries.length} events</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                {(isAdmin || isTeamMember) && <th>Client</th>}
                <th>Type</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Scheduled Date</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 32 }}>
                    No content scheduled yet
                  </td>
                </tr>
              ) : filteredEntries
                .sort((a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0))
                .map(e => {
                  const tc = typeColors[e.contentType] || typeColors.POST;
                  return (
                    <tr key={e.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{e.title}</span>
                        {e.description && (
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{e.description}</div>
                        )}
                      </td>
                      {(isAdmin || isTeamMember) && (
                        <td>
                          {e.client ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                {e.client.fullName?.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{e.client.fullName}</span>
                            </div>
                          ) : '—'}
                        </td>
                      )}
                      <td>
                        <span style={{ padding: '2px 9px', background: tc.bg, color: tc.color, borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                          {e.contentType}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{e.platform || '—'}</td>
                      <td>
                        <span className={`status ${e.status?.toLowerCase()}`}>{e.status}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {e.scheduledDate
                          ? format(new Date(e.scheduledDate), 'dd MMM yyyy, hh:mm a')
                          : '—'}
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-icon btn-sm" onClick={() => openEdit(e)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDelete(e.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Event' : 'New Content Event'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Client selector — admin sees all, team member sees assigned */}
                <div className="form-group">
                  <label className="form-label">
                    Client *
                    {isTeamMember && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>(your assigned clients only)</span>}
                  </label>
                  <select className="form-control" required value={form.clientId}
                    onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {modalClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}{c.companyName ? ` — ${c.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Product Launch Reel" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Content Type</label>
                    <select className="form-control" value={form.contentType}
                      onChange={e => setForm(p => ({ ...p, contentType: e.target.value }))}>
                      {['REEL', 'POST', 'CAROUSEL', 'AD', 'BLOG', 'VIDEO'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {['SCHEDULED', 'PUBLISHED', 'DRAFT', 'CANCELLED'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <input className="form-control" value={form.platform}
                      onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                      placeholder="Instagram, YouTube..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Date & Time</label>
                    <input type="datetime-local" className="form-control" value={form.scheduledDate}
                      onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea className="form-control" rows={2} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Additional notes..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}