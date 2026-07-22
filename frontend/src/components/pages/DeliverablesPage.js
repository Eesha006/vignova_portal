import React, { useEffect, useState } from 'react';
import { deliverableAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Upload, Download, Package, FileText, Film, Image, Users } from 'lucide-react';

const fileIcon = (type) => {
  if (!type) return <FileText size={18} color="#6B7280" />;
  if (type.includes('video')) return <Film size={18} color="#1E88E5" />;
  if (type.includes('image')) return <Image size={18} color="#43A047" />;
  if (type.includes('pdf')) return <FileText size={18} color="#E53935" />;
  return <Package size={18} color="#F4B400" />;
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Get extension from filename
const getExt = (filename) => {
  if (!filename) return '';
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : '';
};

// Map extension to MIME type for blob
const getMimeFromFilename = (filename) => {
  const ext = getExt(filename);
  const map = {
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav',
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    txt: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
};

export default function DeliverablesPage() {
  const { user } = useAuth();
  const [deliverables, setDeliverables] = useState([]);
  const [clients, setClients] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    clientId: '', name: '', category: 'Reel', monthYear: '',
  });
  const [filter, setFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  const load = () => {
    deliverableAPI.getAll()
      .then(r => setDeliverables(r.data || []))
      .catch(() => toast.error('Failed to load deliverables'));
    if (isAdmin) {
      adminAPI.getClients().then(r => setClients(r.data || [])).catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  // Derive assigned clients from deliverables for team member
  const deliverableClients = [...new Map(
    deliverables.filter(d => d.client).map(d => [d.client.id, d.client])
  ).values()];

  const categories = ['All', 'Reel', 'Video', 'Graphic', 'Report', 'Website', 'PDF'];

  const filtered = deliverables
    .filter(d => filter === 'All' || d.category === filter)
    .filter(d => clientFilter === 'All' || d.client?.id?.toString() === clientFilter);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    if (!uploadForm.clientId) { toast.error('Please select a client'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('clientId', uploadForm.clientId);
    fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category);
    fd.append('monthYear', uploadForm.monthYear);
    try {
      await deliverableAPI.upload(fd);
      toast.success('File uploaded and sent to client!');
      setShowUpload(false);
      setFile(null);
      setUploadForm({ clientId: '', name: '', category: 'Reel', monthYear: '' });
      load();
    } catch { toast.error('Upload failed'); }
  };

  const handleDownload = async (d) => {
    try {
      const res = await deliverableAPI.download(d.id);

      // Use content-type from response headers first
      const contentType = res.headers['content-type'] || getMimeFromFilename(d.name || d.filePath);

      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Determine proper filename with extension
      const nameHasExt = d.name && getExt(d.name);
      const filePathExt = d.filePath ? getExt(d.filePath) : '';
      const downloadName = nameHasExt
        ? d.name
        : filePathExt
        ? `${d.name}.${filePathExt}`
        : d.name || 'download';

      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${downloadName}`);
    } catch { toast.error('Download failed'); }
  };

  const pageSubtitle = isAdmin
    ? `${deliverables.length} file(s) across all clients`
    : isTeamMember
    ? `Files for your assigned clients (${deliverableClients.length} client${deliverableClients.length !== 1 ? 's' : ''})`
    : 'All files shared with you by Vignova';

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Deliverables</div>
          <div className="page-subtitle">{pageSubtitle}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setUploadForm({ clientId: '', name: '', category: 'Reel', monthYear: '' });
            setFile(null);
            setShowUpload(true);
          }}>
            <Upload size={16} />Upload File
          </button>
        )}
      </div>

      {isTeamMember && deliverableClients.length > 0 && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>
            Showing deliverables for:&nbsp;
            <strong>{deliverableClients.map(c => c.fullName).join(', ')}</strong>
          </span>
        </div>
      )}

      {isTeamMember && deliverableClients.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#92400E' }}>
          No assigned clients yet.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: filter === c ? '#1E88E5' : 'white', color: filter === c ? 'white' : '#374151', borderColor: filter === c ? '#1E88E5' : '#E5E7EB' }}>
              {c}
            </button>
          ))}
        </div>

        {(isAdmin || isTeamMember) && deliverableClients.length > 0 && (
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', color: '#374151', outline: 'none', cursor: 'pointer' }}>
            <option value="All">All Clients</option>
            {deliverableClients.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.fullName}</option>
            ))}
          </select>
        )}
      </div>

      {(isAdmin || isTeamMember) && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#6B7280' }}>
          Showing <strong style={{ color: '#1F2937' }}>{filtered.length}</strong> file{filtered.length !== 1 ? 's' : ''}
          {clientFilter !== 'All' && (
            <span> for <strong style={{ color: '#1E88E5' }}>
              {deliverableClients.find(c => c.id.toString() === clientFilter)?.fullName}
            </strong></span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={40} />
            <h3>No deliverables found</h3>
            <p>{isAdmin ? 'Upload a file using the button above' : isTeamMember ? 'No files for your assigned clients yet' : 'Files will appear here once uploaded'}</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(d => (
            <div key={d.id} className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, background: '#F3F4F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fileIcon(d.fileType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {d.category} · {formatSize(d.fileSize)}
                    {d.fileType && <span style={{ marginLeft: 6, background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                      {getExt(d.filePath) || getExt(d.name)}
                    </span>}
                  </div>
                </div>
              </div>

              {(isAdmin || isTeamMember) && d.client && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: isTeamMember ? 'linear-gradient(135deg,#43A047,#1565C0)' : 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {d.client.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{d.client.fullName}</span>
                  {d.client.companyName && <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {d.client.companyName}</span>}
                  {isTeamMember && <span style={{ fontSize: 10, background: '#E8F5E9', color: '#43A047', padding: '2px 7px', borderRadius: 99, fontWeight: 700, marginLeft: 'auto' }}>Assigned</span>}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {d.monthYear && (
                    <span style={{ fontSize: 11, background: '#F3F4F6', padding: '3px 8px', borderRadius: 99, color: '#6B7280', fontWeight: 500 }}>{d.monthYear}</span>
                  )}
                  {d.category && (
                    <span style={{ fontSize: 11, background: '#E3F2FD', padding: '3px 8px', borderRadius: 99, color: '#1E88E5', fontWeight: 600 }}>{d.category}</span>
                  )}
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => handleDownload(d)}>
                  <Download size={13} />Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Upload Deliverable</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-control" required value={uploadForm.clientId}
                    onChange={e => setUploadForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client to send to...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.fullName} — {c.companyName || c.email}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">File Name / Title *</label>
                  <input className="form-control" required value={uploadForm.name}
                    onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Reel_Video_May" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={uploadForm.category}
                      onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
                      {['Reel', 'Video', 'Graphic', 'Report', 'Website', 'PDF'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Month / Year</label>
                    <input className="form-control" value={uploadForm.monthYear}
                      onChange={e => setUploadForm(p => ({ ...p, monthYear: e.target.value }))}
                      placeholder="May 2025" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Select File *</label>
                  <input type="file" className="form-control" style={{ padding: '8px' }}
                    onChange={e => setUploadForm(p => ({ ...p, name: p.name || e.target.files[0]?.name?.replace(/\.[^/.]+$/, '') || '' })) ||
                      setFile(e.target.files[0])}
                    onClick={e => { }}
                    ref={input => {
                      if (input) input.onchange = (e) => {
                        const f = e.target.files[0];
                        if (f) {
                          setFile(f);
                          if (!uploadForm.name) {
                            setUploadForm(p => ({ ...p, name: f.name.replace(/\.[^/.]+$/, '') }));
                          }
                        }
                      };
                    }}
                  />
                  {file && (
                    <div style={{ fontSize: 12, color: '#43A047', marginTop: 6 }}>
                      ✓ {file.name} ({formatSize(file.size)}) — will download as <strong>.{getExt(file.name)}</strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Upload size={14} />Upload & Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}