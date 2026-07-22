import React, { useEffect, useState } from 'react';
import { approvalAPI, adminAPI, teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, Clock, Trash2,
  Upload, FileText, Film, Image, Package,
  Download, Link, Lock, Send
} from 'lucide-react';

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getExt = (name) => {
  if (!name) return '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.substring(dot + 1).toLowerCase() : '';
};

const fileIcon = (type, name) => {
  const t = type || '';
  const ext = getExt(name);
  if (t.includes('video') || ['mp4','mov','avi','mkv','webm'].includes(ext))
    return <Film size={16} color="#1E88E5" />;
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext))
    return <Image size={16} color="#43A047" />;
  if (t.includes('pdf') || ext === 'pdf')
    return <FileText size={16} color="#E53935" />;
  return <Package size={16} color="#F4B400" />;
};

export default function ApprovalCenterPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [clients, setClients] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', feedback: '', clientId: '', websiteLink: '' });
  const [clientDecisions, setClientDecisions] = useState({});
  const [savingId, setSavingId] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const isClient = user?.role === 'CLIENT';

  const load = async () => {
    try {
      const res = await approvalAPI.getAll();
      setApprovals(res.data || []);
    } catch { toast.error('Failed to load approvals'); }

    if (isAdmin) {
      // Admin gets all clients
      try {
        const res = await adminAPI.getClients();
        setClients(res.data || []);
      } catch {}
    }

    if (isTeamMember) {
      // Team member gets ONLY their assigned clients
      try {
        const res = await teamAPI.getAssignments();
        // getAssignments returns ClientAssignment objects with .client inside
        const assignedClients = (res.data || []).map(a => a.client).filter(Boolean);
        // Deduplicate by id
        const unique = [...new Map(assignedClients.map(c => [c.id, c])).values()];
        setClients(unique);
      } catch {}
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Please select a client'); return; }
    if (!form.title) { toast.error('Please enter a title'); return; }
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.feedback) fd.append('feedback', form.feedback);
      fd.append('clientId', form.clientId);
      if (form.websiteLink) fd.append('websiteLink', form.websiteLink);
      if (file) fd.append('file', file);
      await approvalAPI.createWithFile(fd);
      toast.success('Approval request sent to client!');
      setShowSendModal(false);
      setFile(null);
      setForm({ title: '', feedback: '', clientId: '', websiteLink: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    }
  };

  const handleClientDecision = async (approvalId) => {
    const decision = clientDecisions[approvalId];
    if (!decision?.status) { toast.error('Please select Approved or Needs Change first'); return; }
    setSavingId(approvalId);
    try {
      await approvalAPI.clientDecision(approvalId, {
        clientDecision: decision.status,
        clientFeedback: decision.feedback || '',
      });
      toast.success('Decision saved permanently!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save decision');
    } finally { setSavingId(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this approval request?')) return;
    try {
      await approvalAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleDownload = async (a) => {
    try {
      const res = await approvalAPI.downloadFile(a.id);
      const mimeType = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const statusClass = (s) => ({
    PENDING: 'pending',
    APPROVED: 'completed',
    CHANGES_REQUESTED: 'changes-requested',
  }[s] || 'pending');

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Approval Center</div>
          <div className="page-subtitle">
            {isClient
              ? 'Review work sent to you by your team — approve or request changes'
              : isTeamMember
              ? `Send work to your assigned clients for approval (${clients.length} client${clients.length !== 1 ? 's' : ''})`
              : 'Send work to clients for approval — files, links, videos, anything'}
          </div>
        </div>
        {(isAdmin || isTeamMember) && (
          <button className="btn btn-primary" onClick={() => {
            setForm({ title: '', feedback: '', clientId: clients[0]?.id?.toString() || '', websiteLink: '' });
            setFile(null);
            setShowSendModal(true);
          }}>
            <Send size={15} />Send for Approval
          </button>
        )}
      </div>

      {/* Team member — show assigned clients */}
      {isTeamMember && clients.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
          No clients assigned yet. Ask your admin to assign clients to you before sending approvals.
        </div>
      )}

      {isTeamMember && clients.length > 0 && (
        <div style={{ background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} color="#43A047" />
          Your assigned clients: <strong>{clients.map(c => c.fullName).join(', ')}</strong>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending', count: approvals.filter(a => a.status === 'PENDING').length, color: '#F4B400', bg: '#FFF8E1', icon: Clock },
          { label: 'Approved', count: approvals.filter(a => a.status === 'APPROVED').length, color: '#43A047', bg: '#E8F5E9', icon: CheckCircle },
          { label: 'Changes Requested', count: approvals.filter(a => a.status === 'CHANGES_REQUESTED').length, color: '#E53935', bg: '#FFEBEE', icon: XCircle },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: bg, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{count}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Approval Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {approvals.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={40} />
              <h3>No approval requests yet</h3>
              <p>{isClient ? 'Your team will send work here for your review' : 'Send work to clients using the button above'}</p>
            </div>
          </div>
        ) : approvals.map(a => {
          const isLocked = a.clientDecisionLocked === true;
          const localDecision = clientDecisions[a.id];

          return (
            <div key={a.id} className="card" style={{
              border: a.status === 'APPROVED' ? '2px solid #43A047'
                : a.status === 'CHANGES_REQUESTED' ? '2px solid #E53935'
                : '1px solid #E5E7EB'
            }}>
              <div style={{ padding: '18px 20px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{a.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className={`status ${statusClass(a.status)}`}>{a.status?.replace('_', ' ')}</span>
                      {isLocked && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280', background: '#F3F4F6', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>
                          <Lock size={11} />Decision Locked
                        </span>
                      )}
                      {a.createdAt && (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                          {new Date(a.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {(isAdmin || isTeamMember) && (
                    <button className="btn btn-icon btn-sm" style={{ color: '#E53935', flexShrink: 0 }}
                      onClick={() => handleDelete(a.id)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Sent by / For client */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                  {a.submittedBy && (
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>Sent by:</span>&nbsp;
                      {a.submittedBy.fullName}
                      <span style={{ fontSize: 11, marginLeft: 5, background: a.submittedBy.role === 'ADMIN' ? '#E3F2FD' : '#E8F5E9', color: a.submittedBy.role === 'ADMIN' ? '#1E88E5' : '#43A047', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                        {a.submittedBy.role === 'ADMIN' ? 'Admin' : 'Team Member'}
                      </span>
                    </div>
                  )}
                  {a.client && (isAdmin || isTeamMember) && (
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>For:</span>&nbsp;
                      {a.client.fullName}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {a.feedback && (
                  <div style={{ background: '#F8FAFC', borderRadius: 9, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#374151', borderLeft: '3px solid #1E88E5' }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                    {a.feedback}
                  </div>
                )}

                {/* File */}
                {a.filePath && (
                  <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, background: 'white', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      {fileIcon(a.fileType, a.fileName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.fileName}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {formatSize(a.fileSize)}
                        {a.fileType && (
                          <span style={{ marginLeft: 6, background: '#E3F2FD', color: '#1E88E5', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            {getExt(a.fileName)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => handleDownload(a)}>
                      <Download size={13} />Download
                    </button>
                  </div>
                )}

                {/* Website link */}
                {a.websiteLink && (
                  <div style={{ background: '#E3F2FD', borderRadius: 9, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link size={15} color="#1E88E5" />
                    <a href={a.websiteLink} target="_blank" rel="noreferrer"
                      style={{ fontSize: 13, color: '#1E88E5', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.websiteLink}
                    </a>
                  </div>
                )}

                {/* CLIENT DECISION SECTION */}
                {isClient && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 4 }}>
                    {isLocked ? (
                      <div style={{ background: a.clientDecision === 'APPROVED' ? '#E8F5E9' : '#FFEBEE', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: a.clientFeedback ? 8 : 0 }}>
                          {a.clientDecision === 'APPROVED'
                            ? <CheckCircle size={18} color="#43A047" />
                            : <XCircle size={18} color="#E53935" />}
                          <span style={{ fontWeight: 700, fontSize: 14, color: a.clientDecision === 'APPROVED' ? '#43A047' : '#E53935' }}>
                            {a.clientDecision === 'APPROVED' ? 'You Approved This' : 'You Requested Changes'}
                          </span>
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9CA3AF' }}>
                            <Lock size={11} />Permanently Saved
                          </span>
                        </div>
                        {a.clientFeedback && (
                          <div style={{ fontSize: 13, color: '#374151', marginTop: 6, paddingLeft: 26 }}>"{a.clientFeedback}"</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                          Your Decision
                          <span style={{ fontSize: 11, color: '#E53935', fontWeight: 400, marginLeft: 8 }}>
                            * Once saved, this cannot be changed
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <button
                            onClick={() => setClientDecisions(prev => ({
                              ...prev, [a.id]: { ...prev[a.id], status: 'APPROVED' }
                            }))}
                            style={{
                              flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #43A047',
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                              background: localDecision?.status === 'APPROVED' ? '#43A047' : 'white',
                              color: localDecision?.status === 'APPROVED' ? 'white' : '#43A047',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              transition: 'all 0.15s',
                            }}>
                            <CheckCircle size={18} />Approve
                          </button>
                          <button
                            onClick={() => setClientDecisions(prev => ({
                              ...prev, [a.id]: { ...prev[a.id], status: 'NEEDS_CHANGE' }
                            }))}
                            style={{
                              flex: 1, padding: '12px', borderRadius: 10, border: '2px solid #E53935',
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                              background: localDecision?.status === 'NEEDS_CHANGE' ? '#E53935' : 'white',
                              color: localDecision?.status === 'NEEDS_CHANGE' ? 'white' : '#E53935',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              transition: 'all 0.15s',
                            }}>
                            <XCircle size={18} />Needs Change
                          </button>
                        </div>

                        {localDecision?.status && (
                          <div style={{ marginBottom: 12 }}>
                            <textarea className="form-control" rows={2}
                              placeholder={localDecision.status === 'APPROVED'
                                ? 'Add comments (optional)...'
                                : 'Describe what changes are needed...'}
                              value={localDecision.feedback || ''}
                              onChange={e => setClientDecisions(prev => ({
                                ...prev, [a.id]: { ...prev[a.id], feedback: e.target.value }
                              }))} />
                          </div>
                        )}

                        {localDecision?.status && (
                          <button
                            style={{
                              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                              cursor: savingId === a.id ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                              background: localDecision.status === 'APPROVED' ? '#43A047' : '#E53935',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                            disabled={savingId === a.id}
                            onClick={() => handleClientDecision(a.id)}>
                            <Lock size={15} />
                            {savingId === a.id ? 'Saving...' : 'Save Decision Permanently'}
                          </button>
                        )}

                        {!localDecision?.status && (
                          <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                            Select Approve or Needs Change, then save
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin/team member — see client's decision */}
                {(isAdmin || isTeamMember) && a.clientDecision && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 14, marginTop: 4 }}>
                    <div style={{ background: a.clientDecision === 'APPROVED' ? '#E8F5E9' : '#FFEBEE', borderRadius: 9, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: a.clientFeedback ? 6 : 0 }}>
                        {a.clientDecision === 'APPROVED'
                          ? <CheckCircle size={16} color="#43A047" />
                          : <XCircle size={16} color="#E53935" />}
                        <span style={{ fontWeight: 700, fontSize: 13, color: a.clientDecision === 'APPROVED' ? '#43A047' : '#E53935' }}>
                          Client {a.clientDecision === 'APPROVED' ? 'Approved' : 'Requested Changes'}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Lock size={10} />Locked
                        </span>
                      </div>
                      {a.clientFeedback && (
                        <div style={{ fontSize: 13, color: '#374151', paddingLeft: 24 }}>"{a.clientFeedback}"</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Send Work for Approval</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowSendModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSend}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Client *
                    {isTeamMember && (
                      <span style={{ fontSize: 11, color: '#43A047', marginLeft: 6, fontWeight: 600 }}>
                        (your assigned clients only)
                      </span>
                    )}
                  </label>
                  {clients.length === 0 ? (
                    <div style={{ padding: '10px 14px', background: '#FFF8E1', borderRadius: 9, fontSize: 13, color: '#92400E', border: '1px solid #FDE68A' }}>
                      {isTeamMember
                        ? 'No clients assigned to you yet. Ask your admin to assign clients.'
                        : 'No clients found.'}
                    </div>
                  ) : (
                    <select className="form-control" required value={form.clientId}
                      onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                      <option value="">Select client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.fullName}{c.companyName ? ` — ${c.companyName}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-control" required value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Instagram Reel — May Week 1" />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes for Client</label>
                  <textarea className="form-control" rows={2} value={form.feedback}
                    onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))}
                    placeholder="Describe what you need approval for..." />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Upload File
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>
                      (video, image, PDF, doc, zip...)
                    </span>
                  </label>
                  <input type="file" className="form-control" style={{ padding: '8px' }}
                    accept="video/*,image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.svg"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) {
                        setFile(f);
                        if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^/.]+$/, '') }));
                      }
                    }} />
                  {file && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#E8F5E9', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {fileIcon(file.type, file.name)}
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{formatSize(file.size)}</span>
                      <button type="button" onClick={() => setFile(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>✕</button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link size={14} />Website / Link (optional)
                  </label>
                  <input className="form-control" value={form.websiteLink}
                    onChange={e => setForm(p => ({ ...p, websiteLink: e.target.value }))}
                    placeholder="https://example.com" type="url" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowSendModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={clients.length === 0}>
                  <Send size={14} />Send for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}