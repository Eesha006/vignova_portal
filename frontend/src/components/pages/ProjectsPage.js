import React, { useEffect, useState } from 'react';
import { projectAPI, adminAPI, teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, FolderKanban, Users } from 'lucide-react';

const statusOptions = ['IN_PROGRESS', 'PENDING', 'COMPLETED', 'DELAYED'];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clientFilter, setClientFilter] = useState('All');
  const [form, setForm] = useState({
    name: '', description: '', progressPercent: 0,
    status: 'PENDING', clientId: '',
  });

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const canEdit = isAdmin || isTeamMember;

  const load = () => {
    projectAPI.getAll()
      .then(r => setProjects(r.data || []))
      .catch(() => toast.error('Failed to load projects'));

    if (isAdmin) {
      adminAPI.getClients()
        .then(r => setClients(r.data || []))
        .catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  // Derive clients from projects for team member
  useEffect(() => {
    if (isTeamMember && projects.length > 0) {
      const clientMap = new Map();
      projects.forEach(p => {
        if (p.client) clientMap.set(p.client.id, p.client);
      });
      setClients([...clientMap.values()]);
    }
  }, [projects, isTeamMember]);

  // Unique clients from projects for filter tabs
  const filterClients = [...new Map(
    projects.filter(p => p.client).map(p => [p.client.id, p.client])
  ).values()];

  const filtered = clientFilter === 'All'
    ? projects
    : projects.filter(p => p.client?.id?.toString() === clientFilter);

  const openNew = () => {
    setEditing(null);
    const defaultClient = clients.length > 0 ? clients[0].id : '';
    setForm({
      name: '', description: '', progressPercent: 0,
      status: 'PENDING', clientId: defaultClient,
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      progressPercent: p.progressPercent,
      status: p.status,
      clientId: p.client?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Please select a client'); return; }
    try {
      const payload = {
        name: form.name,
        description: form.description,
        progressPercent: parseInt(form.progressPercent),
        status: form.status,
        client: { id: parseInt(form.clientId) },
      };
      if (editing) await projectAPI.update(editing.id, payload);
      else await projectAPI.create(payload);
      toast.success(editing ? 'Project updated!' : 'Project created!');
      setShowModal(false);
      load();
    } catch (err) {
      const msg = err.response?.data || 'Failed to save project';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await projectAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      const msg = err.response?.data || 'Failed to delete';
      toast.error(typeof msg === 'string' ? msg : 'Failed to delete');
    }
  };

  const statusLabel = (s) => ({
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    PENDING: 'pending',
    DELAYED: 'delayed',
  }[s] || 'pending');

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">
            {isAdmin
              ? 'All client projects — add, edit, update progress, delete'
              : isTeamMember
              ? 'Projects for your assigned clients — you can add, edit, delete'
              : 'Track your active and completed projects'}
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} />New Project
          </button>
        )}
      </div>

      {/* Team member info banner */}
      {isTeamMember && clients.length > 0 && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>
            Managing projects for:&nbsp;
            <strong>{clients.map(c => c.fullName).join(', ')}</strong>
          </span>
        </div>
      )}

      {isTeamMember && clients.length === 0 && projects.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#92400E' }}>
          No assigned clients yet. Ask your admin to assign clients to you.
        </div>
      )}

      {/* Client filter tabs */}
      {(isAdmin || isTeamMember) && filterClients.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          <button
            onClick={() => setClientFilter('All')}
            style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: clientFilter === 'All' ? '#1E88E5' : 'white', color: clientFilter === 'All' ? 'white' : '#374151', borderColor: clientFilter === 'All' ? '#1E88E5' : '#E5E7EB' }}>
            All Clients
          </button>
          {filterClients.map(c => (
            <button key={c.id}
              onClick={() => setClientFilter(c.id.toString())}
              style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: clientFilter === c.id.toString() ? '#1E88E5' : 'white', color: clientFilter === c.id.toString() ? 'white' : '#374151', borderColor: clientFilter === c.id.toString() ? '#1E88E5' : '#E5E7EB' }}>
              {c.fullName}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      {(isAdmin || isTeamMember) && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', val: filtered.length, color: '#1E88E5', bg: '#E3F2FD' },
            { label: 'In Progress', val: filtered.filter(p => p.status === 'IN_PROGRESS').length, color: '#1E88E5', bg: '#E3F2FD' },
            { label: 'Completed', val: filtered.filter(p => p.status === 'COMPLETED').length, color: '#43A047', bg: '#E8F5E9' },
            { label: 'Delayed', val: filtered.filter(p => p.status === 'DELAYED').length, color: '#E53935', bg: '#FFEBEE' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{val}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Projects table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                {(isAdmin || isTeamMember) && <th>Client</th>}
                <th>Status</th>
                <th style={{ width: 260 }}>Progress</th>
                <th>Start Date</th>
                <th>End Date</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <FolderKanban size={32} />
                      <h3>No projects found</h3>
                      <p>
                        {canEdit
                          ? 'Create a new project using the button above'
                          : 'Projects will appear here once created'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{p.description}</div>
                    )}
                  </td>
                  {(isAdmin || isTeamMember) && (
                    <td>
                      {p.client ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {p.client.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.client.fullName}</div>
                            {p.client.companyName && (
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.client.companyName}</div>
                            )}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                  )}
                  <td>
                    <span className={`status ${statusLabel(p.status)}`}>
                      {p.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-bar-wrap" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, width: 36, textAlign: 'right' }}>
                        {p.progressPercent}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#6B7280' }}>
                    {p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: '#6B7280' }}>
                    {p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  {canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-icon btn-sm" onClick={() => openEdit(p)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDelete(p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Project' : 'New Project'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Client *
                    {isTeamMember && (
                      <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>
                        (your assigned clients only)
                      </span>
                    )}
                  </label>
                  <select className="form-control" required value={form.clientId}
                    onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}{c.companyName ? ` — ${c.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input className="form-control" required value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Website Development" />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Project description..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Progress ({form.progressPercent}%)</label>
                    <input type="range" min={0} max={100}
                      value={form.progressPercent}
                      onChange={e => setForm(p => ({ ...p, progressPercent: parseInt(e.target.value) }))}
                      style={{ width: '100%', marginTop: 8 }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'} Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}