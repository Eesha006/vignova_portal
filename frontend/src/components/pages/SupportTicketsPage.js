import React, { useEffect, useState } from 'react';
import { ticketAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, TicketCheck } from 'lucide-react';
import { format } from 'date-fns';

const ticketTypes = ['WEBSITE_ISSUES', 'CONTENT_CHANGES', 'AD_CAMPAIGN_ISSUES', 'BILLING_ISSUES', 'GENERAL_SUPPORT'];
const typeLabel = (t) => t?.replace(/_/g, ' ') || t;
const statusClass = (s) => ({ OPEN: 'pending', IN_PROGRESS: 'in-progress', RESOLVED: 'completed', CLOSED: 'delayed' }[s] || 'pending');

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', type: 'GENERAL_SUPPORT' });
  const [adminForm, setAdminForm] = useState({ status: '', adminResponse: '' });
  const [filter, setFilter] = useState('ALL');
  const isAdmin = user?.role === 'ADMIN';

  const load = () => ticketAPI.getAll().then(r => setTickets(r.data)).catch(() => toast.error('Failed to load'));
  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? tickets : tickets.filter(t => t.status === filter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ticketAPI.create(form);
      toast.success('Ticket submitted! Our team will respond shortly.');
      setShowModal(false); setForm({ subject: '', description: '', type: 'GENERAL_SUPPORT' }); load();
    } catch { toast.error('Failed to submit ticket'); }
  };

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    try {
      await ticketAPI.update(selected.id, adminForm);
      toast.success('Ticket updated!');
      setShowUpdate(false); load();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Support Tickets</div>
          <div className="page-subtitle">Report issues or request urgent support from our team</div>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />New Ticket
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Open', count: tickets.filter(t => t.status === 'OPEN').length, color: '#F4B400', bg: '#FFF8E1' },
          { label: 'In Progress', count: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: '#1E88E5', bg: '#E3F2FD' },
          { label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED').length, color: '#43A047', bg: '#E8F5E9' },
          { label: 'Closed', count: tickets.filter(t => t.status === 'CLOSED').length, color: '#6B7280', bg: '#F3F4F6' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: bg, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TicketCheck size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{count}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', background: filter === s ? 'white' : 'transparent', color: filter === s ? '#1E88E5' : '#6B7280', boxShadow: filter === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {s === 'IN_PROGRESS' ? 'In Progress' : s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket #</th>
                {isAdmin && <th>Client</th>}
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Team Response</th>
                <th>Created</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No tickets found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: '#1E88E5', fontSize: 13 }}>{t.ticketNumber}</td>
                  {isAdmin && <td>{t.client?.fullName || '—'}</td>}
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>
                    {t.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                  </td>
                  <td><span style={{ fontSize: 12, background: '#F3F4F6', padding: '3px 9px', borderRadius: 99, fontWeight: 500 }}>{typeLabel(t.type)}</span></td>
                  <td><span className={`status ${statusClass(t.status)}`}>{t.status?.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: 13, color: '#6B7280', maxWidth: 180 }}>
                    {t.adminResponse ? <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.adminResponse}</div> : <span style={{ color: '#D1D5DB' }}>Awaiting response...</span>}
                  </td>
                  <td style={{ fontSize: 13, color: '#9CA3AF' }}>{t.createdAt ? format(new Date(t.createdAt), 'dd MMM yyyy') : '—'}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => { setSelected(t); setAdminForm({ status: t.status, adminResponse: t.adminResponse || '' }); setShowUpdate(true); }}>
                        Update
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client new ticket modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Support Ticket</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief summary of the issue..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Ticket Type</label>
                  <select className="form-control" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {ticketTypes.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Detailed Description</label>
                  <textarea className="form-control" rows={4} required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin update modal */}
      {showUpdate && selected && (
        <div className="modal-overlay" onClick={() => setShowUpdate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Update Ticket #{selected.ticketNumber}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowUpdate(false)}>✕</button>
            </div>
            <form onSubmit={handleAdminUpdate}>
              <div className="modal-body">
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selected.subject}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{selected.description}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={adminForm.status} onChange={e => setAdminForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Response to Client</label>
                  <textarea className="form-control" rows={3} value={adminForm.adminResponse} onChange={e => setAdminForm(p => ({ ...p, adminResponse: e.target.value }))} placeholder="Your response..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpdate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
