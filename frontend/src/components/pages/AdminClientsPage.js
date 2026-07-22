import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phoneNumber: '', companyName: '', accountManager: '' });
  const [editId, setEditId] = useState(null);

  const load = () => adminAPI.getClients().then(r => setClients(r.data)).catch(() => toast.error('Failed to load clients'));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ email: '', password: '', fullName: '', phoneNumber: '', companyName: '', accountManager: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditId(c.id); setForm({ email: c.email, password: '', fullName: c.fullName, phoneNumber: c.phoneNumber || '', companyName: c.companyName || '', accountManager: c.accountManager || '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await adminAPI.updateClient(editId, form);
        toast.success('Client updated!');
      } else {
        await adminAPI.createClient(form);
        toast.success('Client created! They can now log in.');
      }
      setShowModal(false); load();
    } catch (err) {
      toast.error(err.response?.status === 400 ? 'Email already exists' : 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client? This will remove all their data.')) return;
    try { await adminAPI.deleteClient(id); toast.success('Client deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Manage Clients</div>
          <div className="page-subtitle">Add, edit, and manage all client accounts</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} />Add Client</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, background: '#E3F2FD', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="#1E88E5" /></div>
          <div><div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans' }}>{clients.length}</div><div style={{ fontSize: 13, color: '#6B7280' }}>Total Clients</div></div>
        </div>
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, background: '#E8F5E9', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="#43A047" /></div>
          <div><div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: '#43A047' }}>{clients.filter(c => c.active).length}</div><div style={{ fontSize: 13, color: '#6B7280' }}>Active Clients</div></div>
        </div>
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, background: '#FFF8E1', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="#F4B400" /></div>
          <div><div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: '#F4B400' }}>{new Set(clients.map(c => c.accountManager).filter(Boolean)).size}</div><div style={{ fontSize: 13, color: '#6B7280' }}>Account Managers</div></div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Company</th><th>Phone</th><th>Account Manager</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><Users size={36} /><h3>No clients yet</h3><p>Add your first client to get started.</p></div></td></tr>
              ) : clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #1E88E5, #43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{c.fullName}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#6B7280' }}>{c.email}</td>
                  <td>{c.companyName || '—'}</td>
                  <td style={{ fontSize: 13 }}>{c.phoneNumber || '—'}</td>
                  <td>{c.accountManager || '—'}</td>
                  <td><span className={`status ${c.active ? 'completed' : 'delayed'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                      <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Client' : 'Add New Client'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Rahul Sharma" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="rahul@company.com" disabled={!!editId} />
                  </div>
                </div>
                {!editId && (
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 6 characters" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input className="form-control" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} placeholder="Rahul Enterprises" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+91 9876543210" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Account Manager</label>
                  <input className="form-control" value={form.accountManager} onChange={e => setForm(p => ({ ...p, accountManager: e.target.value }))} placeholder="Sneha Sharma" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'} Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
