import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPass !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword(user?.email, pwForm.newPass);
      toast.success('Password changed successfully!');
      setPwForm({ current: '', newPass: '', confirm: '' });
    } catch { toast.error('Failed to change password'); }
    finally { setSaving(false); }
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page">
      <div className="page-title">Profile Settings</div>
      <div className="page-subtitle">Manage your account information and security</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
        {/* Profile Info */}
        <div className="card">
          <div className="card-header"><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} color="#1E88E5" /><div className="card-title">Account Information</div></div></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '16px', background: '#F8FAFC', borderRadius: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #1E88E5 0%, #43A047 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 26, fontFamily: 'Plus Jakarta Sans', flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'Plus Jakarta Sans', marginBottom: 2 }}>{user?.fullName}</div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>{user?.email}</div>
                <span style={{ padding: '3px 12px', background: user?.role === 'ADMIN' ? '#EDE9FE' : '#E3F2FD', color: user?.role === 'ADMIN' ? '#7C3AED' : '#1E88E5', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  {user?.role}
                </span>
              </div>
            </div>
            {[
              { label: 'Full Name', value: user?.fullName },
              { label: 'Email Address', value: user?.email },
              { label: 'Company', value: user?.companyName || 'Not set' },
              { label: 'Account Manager', value: user?.accountManager || 'Assigned' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 13.5, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header"><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} color="#1E88E5" /><div className="card-title">Change Password</div></div></div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-control" required value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Your current password" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" required value={pwForm.newPass} onChange={e => setPwForm(p => ({ ...p, newPass: e.target.value }))} placeholder="Minimum 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-control" required value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                <Save size={15} />{saving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
            <div style={{ marginTop: 20, padding: '12px 14px', background: '#FFF8E1', borderRadius: 9, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 12.5, color: '#92400E', fontWeight: 600, marginBottom: 4 }}>Password Requirements</div>
              <div style={{ fontSize: 12, color: '#92400E' }}>• Minimum 6 characters<br />• Mix of letters and numbers recommended</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
