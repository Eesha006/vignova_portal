import React, { useEffect, useState } from 'react';
import { brandAssetAPI, adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Upload, Download, Trash2, Edit2, Plus,
  Palette, FileText, Image, Film, Package,
  FolderOpen, Users, X, Check
} from 'lucide-react';

const categories = [
  'All', 'Logos', 'Brand Guidelines', 'Fonts',
  'Images', 'Marketing Materials', 'Videos', 'Other'
];

const formatSize = (bytes) => {
  if (!bytes) return '—';
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
    return <Film size={20} color="#1E88E5" />;
  if (t.includes('image') || ['jpg','jpeg','png','gif','webp','svg'].includes(ext))
    return <Image size={20} color="#43A047" />;
  if (t.includes('pdf') || ext === 'pdf')
    return <FileText size={20} color="#E53935" />;
  if (['ttf','otf','woff','woff2'].includes(ext))
    return <FileText size={20} color="#7C3AED" />;
  if (['zip','rar'].includes(ext))
    return <Package size={20} color="#F4B400" />;
  if (['doc','docx','ppt','pptx','xls','xlsx'].includes(ext))
    return <FileText size={20} color="#1565C0" />;
  return <FolderOpen size={20} color="#6B7280" />;
};

const categoryColor = (cat) => {
  const map = {
    'Logos': { bg: '#E3F2FD', color: '#1E88E5' },
    'Brand Guidelines': { bg: '#E8F5E9', color: '#43A047' },
    'Fonts': { bg: '#FFF8E1', color: '#F4B400' },
    'Images': { bg: '#E3F2FD', color: '#1565C0' },
    'Marketing Materials': { bg: '#E8F5E9', color: '#43A047' },
    'Videos': { bg: '#FFEBEE', color: '#E53935' },
    'Other': { bg: '#F3F4F6', color: '#6B7280' },
  };
  return map[cat] || { bg: '#F3F4F6', color: '#6B7280' };
};

export default function BrandAssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    clientId: '', name: '', category: 'Logos', description: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', category: '', description: '',
  });

  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  const load = async () => {
    try {
      const res = await brandAssetAPI.getAll();
      setAssets(res.data || []);
    } catch { toast.error('Failed to load brand assets'); }

    if (isAdmin) {
      try {
        const res = await adminAPI.getClients();
        setClients(res.data || []);
      } catch {}
    }
  };

  useEffect(() => { load(); }, []);

  // Derive clients visible in this page for filter
  const visibleClients = [...new Map(
    assets.filter(a => a.client).map(a => [a.client.id, a.client])
  ).values()];

  const filtered = assets
    .filter(a => filter === 'All' || a.category === filter)
    .filter(a => clientFilter === 'All' || a.client?.id?.toString() === clientFilter);

  // Group by category for folder view
  const grouped = categories.slice(1).reduce((acc, cat) => {
    const items = filtered.filter(a => a.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  const uncategorized = filtered.filter(a => !a.category || a.category === 'Other');
  if (uncategorized.length > 0) grouped['Other'] = uncategorized;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    if (!uploadForm.clientId) { toast.error('Please select a client'); return; }
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('clientId', uploadForm.clientId);
      fd.append('name', uploadForm.name || file.name.replace(/\.[^/.]+$/, ''));
      fd.append('category', uploadForm.category);
      if (uploadForm.description) fd.append('description', uploadForm.description);
      await brandAssetAPI.upload(fd);
      toast.success('Brand asset uploaded!');
      setShowUpload(false);
      setFile(null);
      setUploadForm({ clientId: '', name: '', category: 'Logos', description: '' });
      load();
    } catch { toast.error('Upload failed'); }
  };

  const openEdit = (asset) => {
    setEditingAsset(asset);
    setEditForm({
      name: asset.name,
      category: asset.category || 'Other',
      description: asset.description || '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await brandAssetAPI.update(editingAsset.id, editForm);
      toast.success('Asset updated!');
      setShowEdit(false);
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this brand asset?')) return;
    try {
      await brandAssetAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDownload = async (asset) => {
    try {
      const res = await brandAssetAPI.download(asset.id);
      const mimeType = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.fileName || asset.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const pageSubtitle = isAdmin
    ? `${assets.length} asset(s) across all clients`
    : isTeamMember
    ? `Brand assets for your assigned clients`
    : 'Your brand files — logos, guidelines, fonts and more';

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Brand Assets Vault</div>
          <div className="page-subtitle">{pageSubtitle}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => {
            setUploadForm({ clientId: clients[0]?.id || '', name: '', category: 'Logos', description: '' });
            setFile(null);
            setShowUpload(true);
          }}>
            <Plus size={16} />Upload Asset
          </button>
        )}
      </div>

      {/* Team member info */}
      {isTeamMember && visibleClients.length > 0 && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>
            Viewing brand assets for: <strong>{visibleClients.map(c => c.fullName).join(', ')}</strong>
          </span>
        </div>
      )}

      {isTeamMember && visibleClients.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#92400E' }}>
          No assigned clients yet. Ask your admin to assign clients to you.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', background: filter === cat ? '#1E88E5' : 'white', color: filter === cat ? 'white' : '#374151', borderColor: filter === cat ? '#1E88E5' : '#E5E7EB' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Client filter — admin and team member */}
        {(isAdmin || isTeamMember) && visibleClients.length > 0 && (
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', color: '#374151', outline: 'none', cursor: 'pointer' }}>
            <option value="All">All Clients</option>
            {visibleClients.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.fullName}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats */}
      {(isAdmin || isTeamMember) && (
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          Showing <strong style={{ color: '#1F2937' }}>{filtered.length}</strong> asset{filtered.length !== 1 ? 's' : ''}
          {clientFilter !== 'All' && (
            <span> for <strong style={{ color: '#1E88E5' }}>
              {visibleClients.find(c => c.id.toString() === clientFilter)?.fullName}
            </strong></span>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <Palette size={40} />
            <h3>No brand assets found</h3>
            <p>{isAdmin ? 'Upload assets using the button above' : 'No brand assets available yet'}</p>
          </div>
        </div>
      )}

      {/* Grouped by category */}
      {Object.entries(grouped).map(([cat, items]) => {
        const cc = categoryColor(cat);
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: cc.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderOpen size={16} color={cc.color} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Plus Jakarta Sans' }}>{cat}</div>
              <span style={{ fontSize: 12, background: cc.bg, color: cc.color, padding: '2px 9px', borderRadius: 99, fontWeight: 600 }}>
                {items.length} file{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Asset cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {items.map(asset => (
                <div key={asset.id} className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* File info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, background: cc.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {fileIcon(asset.fileType, asset.fileName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.name}>
                        {asset.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>{formatSize(asset.fileSize)}</span>
                        {asset.fileName && (
                          <span style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            {getExt(asset.fileName)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Client tag — admin and team member */}
                  {(isAdmin || isTeamMember) && asset.client && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {asset.client.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{asset.client.fullName}</span>
                      {asset.client.companyName && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>· {asset.client.companyName}</span>
                      )}
                      {isTeamMember && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, background: '#E8F5E9', color: '#43A047', padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>
                          Assigned
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {asset.description && (
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
                      {asset.description}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-sm btn-outline" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleDownload(asset)}>
                      <Download size={13} />Download
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn btn-icon btn-sm" title="Edit"
                          onClick={() => openEdit(asset)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }}
                          title="Delete" onClick={() => handleDelete(asset.id)}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Upload Modal — admin only */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">Upload Brand Asset</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-control" required value={uploadForm.clientId}
                    onChange={e => setUploadForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}{c.companyName ? ` — ${c.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Asset Name</label>
                  <input className="form-control" value={uploadForm.name}
                    onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Primary Logo" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={uploadForm.category}
                      onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
                      {categories.slice(1).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description (optional)</label>
                    <input className="form-control" value={uploadForm.description}
                      onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Short description..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Select File *</label>
                  <input type="file" className="form-control" style={{ padding: 8 }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) {
                        setFile(f);
                        if (!uploadForm.name)
                          setUploadForm(p => ({ ...p, name: f.name.replace(/\.[^/.]+$/, '') }));
                      }
                    }} />
                  {file && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#E8F5E9', borderRadius: 8, fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={14} color="#43A047" />
                      {file.name} ({formatSize(file.size)})
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Upload size={14} />Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal — admin only */}
      {showEdit && editingAsset && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">Edit Brand Asset</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Asset Name</label>
                  <input className="form-control" required value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={editForm.category}
                    onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                    {categories.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-control" value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Check size={14} />Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}