import React, { useEffect, useState } from 'react';
import { reportAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Plus, Edit2, Trash2, FileDown, Upload,
  TrendingUp, Users, Eye, MousePointer,
  ChevronDown, ChevronUp, FileText, X
} from 'lucide-react';

const formatSize = (b) => {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
};

const emptyMetrics = {
  monthYear: '', reach: '', engagement: '', clicks: '',
  followers: '', leads: '', adSpend: '', cpc: '', roas: '',
  websiteTraffic: '', instagramReach: '', facebookReach: '',
  youtubeReach: '', instagramEngagement: '', facebookEngagement: '',
  youtubeEngagement: '', notes: '',
};

export default function PerformanceReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyMetrics, clientId: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPdfId, setUploadingPdfId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const isClient = user?.role === 'CLIENT';
  const canEdit = isAdmin || isTeamMember;

  const load = async () => {
    try {
      const res = await reportAPI.getAll();
      setReports(res.data || []);
      if (!selectedReport && res.data?.length > 0) {
        setSelectedReport(res.data[0]);
      }
    } catch { toast.error('Failed to load reports'); }

    if (isAdmin) {
      try {
        const res = await adminAPI.getClients();
        setClients(res.data || []);
      } catch {}
    }
  };

  useEffect(() => { load(); }, []);

  // Clients visible from reports
  const visibleClients = [...new Map(
    reports.filter(r => r.client).map(r => [r.client.id, r.client])
  ).values()];

  // Filter reports
  const filteredReports = selectedClientId === 'all'
    ? reports
    : reports.filter(r => r.client?.id?.toString() === selectedClientId);

  // Build chart data from filtered reports
  const chartData = [...filteredReports]
    .sort((a, b) => a.monthYear?.localeCompare(b.monthYear))
    .map(r => ({
      name: r.monthYear,
      Reach: r.reach || 0,
      Engagement: r.engagement || 0,
      Clicks: r.clicks || 0,
      Leads: r.leads || 0,
      Followers: r.followers || 0,
    }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyMetrics, clientId: clients[0]?.id || '' });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      clientId: r.client?.id || '',
      monthYear: r.monthYear || '',
      reach: r.reach || '',
      engagement: r.engagement || '',
      clicks: r.clicks || '',
      followers: r.followers || '',
      leads: r.leads || '',
      adSpend: r.adSpend || '',
      cpc: r.cpc || '',
      roas: r.roas || '',
      websiteTraffic: r.websiteTraffic || '',
      instagramReach: r.instagramReach || '',
      facebookReach: r.facebookReach || '',
      youtubeReach: r.youtubeReach || '',
      instagramEngagement: r.instagramEngagement || '',
      facebookEngagement: r.facebookEngagement || '',
      youtubeEngagement: r.youtubeEngagement || '',
      notes: r.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        client: { id: parseInt(form.clientId) },
        reach: form.reach ? parseInt(form.reach) : null,
        engagement: form.engagement ? parseInt(form.engagement) : null,
        clicks: form.clicks ? parseInt(form.clicks) : null,
        followers: form.followers ? parseInt(form.followers) : null,
        leads: form.leads ? parseInt(form.leads) : null,
        adSpend: form.adSpend ? parseFloat(form.adSpend) : null,
        websiteTraffic: form.websiteTraffic ? parseInt(form.websiteTraffic) : null,
        instagramReach: form.instagramReach ? parseInt(form.instagramReach) : null,
        facebookReach: form.facebookReach ? parseInt(form.facebookReach) : null,
        youtubeReach: form.youtubeReach ? parseInt(form.youtubeReach) : null,
        instagramEngagement: form.instagramEngagement ? parseInt(form.instagramEngagement) : null,
        facebookEngagement: form.facebookEngagement ? parseInt(form.facebookEngagement) : null,
        youtubeEngagement: form.youtubeEngagement ? parseInt(form.youtubeEngagement) : null,
      };
      if (editingId) await reportAPI.update(editingId, payload);
      else await reportAPI.create(payload);
      toast.success(editingId ? 'Report updated!' : 'Report created!');
      setShowForm(false);
      load();
    } catch { toast.error('Failed to save report'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try { await reportAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handlePdfUpload = async (reportId) => {
    if (!pdfFile) { toast.error('Select a PDF first'); return; }
    setUploadingPdfId(reportId);
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      await reportAPI.uploadPdf(reportId, fd);
      toast.success('PDF uploaded!');
      setPdfFile(null);
      setUploadingPdfId(null);
      load();
    } catch { toast.error('Upload failed'); setUploadingPdfId(null); }
  };

  const handlePdfDelete = async (id) => {
    if (!window.confirm('Remove PDF from this report?')) return;
    try { await reportAPI.deletePdf(id); toast.success('PDF removed'); load(); }
    catch { toast.error('Failed to remove PDF'); }
  };

  const handlePdfDownload = async (r) => {
    try {
      const res = await reportAPI.downloadPdf(r.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = r.pdfName || `Report_${r.monthYear}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Performance Reports</div>
          <div className="page-subtitle">
            {isClient ? 'Your monthly analytics and campaign performance'
              : 'Manage and view performance reports for all clients'}
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />Add Report
          </button>
        )}
      </div>

      {/* Client selector tabs — admin and team member */}
      {(isAdmin || isTeamMember) && visibleClients.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={() => setSelectedClientId('all')}
            style={{ padding: '7px 18px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: selectedClientId === 'all' ? '#1E88E5' : 'white', color: selectedClientId === 'all' ? 'white' : '#374151', borderColor: selectedClientId === 'all' ? '#1E88E5' : '#E5E7EB' }}>
            All Clients
          </button>
          {visibleClients.map(c => (
            <button key={c.id} onClick={() => setSelectedClientId(c.id.toString())}
              style={{ padding: '7px 18px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: selectedClientId === c.id.toString() ? '#1E88E5' : 'white', color: selectedClientId === c.id.toString() ? 'white' : '#374151', borderColor: selectedClientId === c.id.toString() ? '#1E88E5' : '#E5E7EB' }}>
              {c.fullName}
            </button>
          ))}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <TrendingUp size={40} />
            <h3>No reports yet</h3>
            <p>{canEdit ? 'Add a report using the button above' : 'Reports will appear here once added by your team'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Charts — only when one client selected or client view */}
          {(selectedClientId !== 'all' || isClient) && chartData.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">Reach & Engagement Trend</div></div>
                <div className="card-body" style={{ padding: '10px 10px 0' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reach" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1E88E5" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#1E88E5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="eng" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#43A047" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#43A047" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Reach" stroke="#1E88E5" fill="url(#reach)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Engagement" stroke="#43A047" fill="url(#eng)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Leads Generated</div></div>
                <div className="card-body" style={{ padding: '10px 10px 0' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="Leads" fill="#1E88E5" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Reports list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredReports.map(r => {
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="card">
                  {/* Report header */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, background: '#E3F2FD', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={20} color="#1E88E5" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{r.monthYear}</div>
                        {(isAdmin || isTeamMember) && r.client && (
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            {r.client.fullName}{r.client.companyName ? ` · ${r.client.companyName}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Quick stats */}
                      {[
                        { label: 'Reach', value: r.reach ? r.reach.toLocaleString() : '—', color: '#1E88E5' },
                        { label: 'Leads', value: r.leads || '—', color: '#43A047' },
                        { label: 'Engagement', value: r.engagement ? r.engagement.toLocaleString() : '—', color: '#F4B400' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '4px 12px', background: '#F8FAFC', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'Plus Jakarta Sans' }}>{s.value}</div>
                          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{s.label}</div>
                        </div>
                      ))}
                      {r.pdfPath && (
                        <span style={{ fontSize: 11, background: '#E8F5E9', color: '#43A047', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>PDF</span>
                      )}
                      {isExpanded ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #E5E7EB', padding: '20px' }}>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                        {canEdit && (
                          <button className="btn btn-sm btn-outline" onClick={() => openEdit(r)}>
                            <Edit2 size={13} />Edit Metrics
                          </button>
                        )}
                        {canEdit && (
                          <button className="btn btn-sm btn-outline" style={{ color: '#E53935', borderColor: '#E53935' }}
                            onClick={() => handleDelete(r.id)}>
                            <Trash2 size={13} />Delete Report
                          </button>
                        )}
                        {r.pdfPath && (
                          <button className="btn btn-sm btn-outline" onClick={() => handlePdfDownload(r)}>
                            <FileDown size={13} />Download PDF ({r.pdfName})
                          </button>
                        )}
                        {canEdit && r.pdfPath && (
                          <button className="btn btn-sm btn-outline" style={{ color: '#E53935', borderColor: '#E53935' }}
                            onClick={() => handlePdfDelete(r.id)}>
                            <X size={13} />Remove PDF
                          </button>
                        )}
                      </div>

                      {/* PDF upload — admin/team member */}
                      {canEdit && (
                        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <FileText size={16} color="#1E88E5" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                            {r.pdfPath ? 'Replace PDF Report' : 'Upload PDF Report'}
                          </span>
                          <input type="file" accept=".pdf" className="form-control"
                            style={{ padding: 6, maxWidth: 300 }}
                            onChange={e => setPdfFile(e.target.files[0])} />
                          <button className="btn btn-sm btn-primary"
                            disabled={uploadingPdfId === r.id}
                            onClick={() => handlePdfUpload(r.id)}>
                            <Upload size={13} />
                            {uploadingPdfId === r.id ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      )}

                      {/* Metrics grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                        {[
                          { label: 'Total Reach', value: r.reach?.toLocaleString(), color: '#1E88E5' },
                          { label: 'Engagement', value: r.engagement?.toLocaleString(), color: '#43A047' },
                          { label: 'Clicks', value: r.clicks?.toLocaleString(), color: '#F4B400' },
                          { label: 'Followers', value: r.followers?.toLocaleString(), color: '#1565C0' },
                          { label: 'Leads', value: r.leads?.toLocaleString(), color: '#43A047' },
                          { label: 'Ad Spend', value: r.adSpend ? `₹${Number(r.adSpend).toLocaleString('en-IN')}` : null, color: '#E53935' },
                          { label: 'CPC', value: r.cpc, color: '#7C3AED' },
                          { label: 'ROAS', value: r.roas, color: '#F4B400' },
                          { label: 'Website Traffic', value: r.websiteTraffic?.toLocaleString(), color: '#1E88E5' },
                        ].filter(m => m.value).map(({ label, value, color }) => (
                          <div key={label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{value}</div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Platform breakdown */}
                      {(r.instagramReach || r.facebookReach || r.youtubeReach) && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Platform Breakdown</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                              { platform: 'Instagram', reach: r.instagramReach, eng: r.instagramEngagement, color: '#E1306C', emoji: '📸' },
                              { platform: 'Facebook', reach: r.facebookReach, eng: r.facebookEngagement, color: '#1877F2', emoji: '👥' },
                              { platform: 'YouTube', reach: r.youtubeReach, eng: r.youtubeEngagement, color: '#FF0000', emoji: '▶️' },
                            ].filter(p => p.reach).map(p => (
                              <div key={p.platform} style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <span style={{ fontSize: 18 }}>{p.emoji}</span>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: p.color }}>{p.platform}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>Reach: <strong>{p.reach?.toLocaleString()}</strong></div>
                                {p.eng && <div style={{ fontSize: 13 }}>Engagement: <strong>{p.eng?.toLocaleString()}</strong></div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {r.notes && (
                        <div style={{ background: '#F8FAFC', borderRadius: 9, padding: '12px 14px', borderLeft: '3px solid #1E88E5' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                          <div style={{ fontSize: 13, color: '#374151' }}>{r.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">{editingId ? 'Edit Report' : 'Add Performance Report'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {isAdmin && !editingId && (
                  <div className="form-group">
                    <label className="form-label">Client *</label>
                    <select className="form-control" required value={form.clientId}
                      onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                      <option value="">Select client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName} — {c.companyName || c.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Month / Year *</label>
                  <input className="form-control" required value={form.monthYear}
                    onChange={e => setForm(p => ({ ...p, monthYear: e.target.value }))}
                    placeholder="May 2025" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 8 }}>Overall Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { key: 'reach', label: 'Total Reach' },
                    { key: 'engagement', label: 'Engagement' },
                    { key: 'clicks', label: 'Clicks' },
                    { key: 'followers', label: 'Followers' },
                    { key: 'leads', label: 'Leads' },
                    { key: 'websiteTraffic', label: 'Website Traffic' },
                    { key: 'adSpend', label: 'Ad Spend (₹)' },
                    { key: 'cpc', label: 'CPC' },
                    { key: 'roas', label: 'ROAS' },
                  ].map(({ key, label }) => (
                    <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>{label}</label>
                      <input className="form-control" value={form[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="0" />
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8, marginTop: 8 }}>Platform Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {[
                    { key: 'instagramReach', label: '📸 Instagram Reach' },
                    { key: 'instagramEngagement', label: '📸 Instagram Engagement' },
                    { key: 'facebookReach', label: '👥 Facebook Reach' },
                    { key: 'facebookEngagement', label: '👥 Facebook Engagement' },
                    { key: 'youtubeReach', label: '▶️ YouTube Reach' },
                    { key: 'youtubeEngagement', label: '▶️ YouTube Engagement' },
                  ].map(({ key, label }) => (
                    <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>{label}</label>
                      <input className="form-control" value={form[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="0" />
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes for this month..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Create'} Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}