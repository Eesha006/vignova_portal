import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI, deliverableAPI } from '../../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  FolderKanban, CheckSquare, Package, Receipt,
  UserCircle2, TrendingUp, ArrowRight, Download,
  Users, Clock, UserCheck, Briefcase, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const perfData = [
  { name: 'May 1',  Reach: 3200, Engagement: 2100, Clicks: 890 },
  { name: 'May 7',  Reach: 4100, Engagement: 2800, Clicks: 1100 },
  { name: 'May 14', Reach: 5200, Engagement: 3400, Clicks: 1400 },
  { name: 'May 21', Reach: 6100, Engagement: 3900, Clicks: 1650 },
  { name: 'May 28', Reach: 7400, Engagement: 4500, Clicks: 1950 },
];

const taskStatusColor = {
  NOT_STARTED:    { bg: '#F3F4F6', color: '#6B7280' },
  IN_PROGRESS:    { bg: '#E3F2FD', color: '#1E88E5' },
  REVIEW_PENDING: { bg: '#FFF8E1', color: '#F4B400' },
  COMPLETED:      { bg: '#E8F5E9', color: '#43A047' },
  OVERDUE:        { bg: '#FFEBEE', color: '#E53935' },
};

// ─── Team Member Dashboard ───────────────────────────────────────────────────
function TeamMemberDashboard({ data, navigate, handleDownload }) {
  const pendingTasks   = data?.pendingTasks      || [];
  const recentDelivs   = data?.recentDeliverables|| [];
  const recentApprovals= data?.recentApprovals   || [];
  const pendingApprovals= data?.pendingApprovals || [];
  const projects       = data?.projects          || [];
  const assignedClients= data?.assignedClients   || [];

  return (
    <>
      <div className="page-title">Welcome back, {data?.clientName?.split(' ')[0]} 👋</div>
      <div className="page-subtitle" style={{ marginBottom: 24 }}>
        Here's your work overview for today.
      </div>

      {/* Assigned clients banner */}
      {assignedClients.length > 0 && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>
            Assigned clients:&nbsp;
            <strong>{assignedClients.map(c => c.fullName).join(', ')}</strong>
          </span>
        </div>
      )}

      {assignedClients.length === 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#F4B400" />
          <span style={{ fontSize: 13, color: '#92400E' }}>
            No clients assigned yet. Contact your admin.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => navigate('/projects')}>
          <div className="stat-icon blue"><FolderKanban size={20} /></div>
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{data?.activeProjects || 0}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{data?.totalProjects || 0} total</div>
          <div className="stat-link">View projects →</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/approvals')}>
          <div className="stat-icon gold"><CheckSquare size={20} /></div>
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{pendingApprovals.length}</div>
          <div className="stat-link">View approvals →</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/deliverables')}>
          <div className="stat-icon green"><Package size={20} /></div>
          <div className="stat-label">Deliverables</div>
          <div className="stat-value">{data?.totalDeliverables || 0}</div>
          <div className="stat-link">View files →</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon gold"><Briefcase size={20} /></div>
          <div className="stat-label">My Pending Tasks</div>
          <div className="stat-value">{data?.totalPendingTasks || 0}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
            {data?.completedTasks || 0} completed · {data?.overdueTasks || 0} overdue
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/messages')}>
          <div className="stat-icon green"><UserCheck size={20} /></div>
          <div className="stat-label">Assigned Clients</div>
          <div className="stat-value">{assignedClients.length}</div>
          <div className="stat-link">Message →</div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Project Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Active Projects</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/projects')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="card-body">
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <FolderKanban size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                <p>No active projects</p>
              </div>
            ) : projects.map(p => (
              <div key={p.id} className="progress-row">
                <span className="progress-label" style={{ fontSize: 12.5 }}>
                  {p.name}
                  {p.client && (
                    <span style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>
                      {p.client.fullName}
                    </span>
                  )}
                </span>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} />
                </div>
                <span className="progress-pct">{p.progressPercent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">My Tasks</div>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{pendingTasks.length} pending</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {pendingTasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No pending tasks 🎉
              </div>
            ) : pendingTasks.map(t => {
              const sc = taskStatusColor[t.status] || taskStatusColor.NOT_STARTED;
              return (
                <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.client && <span>{t.client.fullName} · </span>}
                      {t.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {new Date(t.dueDate).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ padding: '3px 9px', background: sc.bg, color: sc.color, borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr', gap: 18 }}>

        {/* Recent Deliverables */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Deliverables</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/deliverables')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentDelivs.length === 0 ? (
              <div style={{ padding: '20px', color: '#9CA3AF', textAlign: 'center', fontSize: 13 }}>
                No deliverables yet
              </div>
            ) : recentDelivs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12, borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: 32, height: 32, background: '#EFF6FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E88E5', flexShrink: 0 }}>
                  <Package size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {d.client?.fullName} · {d.monthYear || 'Recent'}
                  </div>
                </div>
                <button className="btn-icon btn" title="Download" onClick={() => handleDownload(d)}>
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Requests */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Approval Requests</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/approvals')}>
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentApprovals.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No approval requests yet
              </div>
            ) : recentApprovals.map(a => {
              const statusColors = {
                PENDING:            { bg: '#FFF8E1', color: '#B45309', label: 'Pending' },
                APPROVED:           { bg: '#E8F5E9', color: '#43A047', label: 'Approved' },
                CHANGES_REQUESTED:  { bg: '#FFEBEE', color: '#E53935', label: 'Changes' },
              };
              const sc = statusColors[a.status] || statusColors.PENDING;
              return (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {a.client?.fullName} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : ''}
                    </div>
                  </div>
                  <span style={{ padding: '3px 9px', background: sc.bg, color: sc.color, borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promo */}
        <div className="promo-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, fontFamily: 'Plus Jakarta Sans' }}>
            Keep Up The Great Work!
          </div>
          <p style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 16, lineHeight: 1.6 }}>
            {assignedClients.length} client{assignedClients.length !== 1 ? 's' : ''} are counting on you.
          </p>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={28} color="white" />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 4px', color: '#9CA3AF', fontSize: 12, borderTop: '1px solid #E5E7EB', marginTop: 20 }}>
        © 2025 Vignova Marketing. All Rights Reserved.
      </div>
    </>
  );
}

// ─── Admin / Client Dashboard ─────────────────────────────────────────────────
function AdminClientDashboard({ data, navigate, handleDownload, isAdmin, user }) {
  const projects        = data?.projects          || [];
  const recentDelivs    = data?.recentDeliverables|| [];
  const recentApprovals = data?.recentApprovals   || [];
  const pendingApprovals= data?.pendingApprovals  || [];
  const invoice         = data?.currentInvoice;
  const accountManager  = data?.accountManager;
  const hasManager      = accountManager && accountManager !== 'null' && accountManager !== 'undefined';

  return (
    <>
      <div className="page-title">Welcome back, {user?.fullName?.split(' ')[0]} 👋</div>
      <div className="page-subtitle" style={{ marginBottom: 24 }}>
        Here's what's happening with your projects today.
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => navigate('/projects')}>
          <div className="stat-icon blue"><FolderKanban size={20} /></div>
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{data?.activeProjects || 0}</div>
          {isAdmin && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{data?.totalProjects || 0} total</div>}
          <div className="stat-link">View all projects →</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/approvals')}>
          <div className="stat-icon gold"><CheckSquare size={20} /></div>
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{pendingApprovals.length}</div>
          <div className="stat-link">View all →</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/deliverables')}>
          <div className="stat-icon green"><Package size={20} /></div>
          <div className="stat-label">Total Deliverables</div>
          <div className="stat-value">{data?.totalDeliverables || 0}</div>
          <div className="stat-link">View files →</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/invoices')}>
          <div className="stat-icon blue"><Receipt size={20} /></div>
          <div className="stat-label">Current Month Invoice</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {invoice ? `₹${Number(invoice.amount).toLocaleString('en-IN')}` : '₹0'}
          </div>
          <div className="stat-link">View invoice →</div>
        </div>

        {isAdmin ? (
          <div className="stat-card" onClick={() => navigate('/admin/team')}>
            <div className="stat-icon green"><Users size={20} /></div>
            <div className="stat-label">Team Members</div>
            <div className="stat-value">{data?.activeTeamMembers || 0}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{data?.totalTeamMembers || 0} total</div>
            <div className="stat-link">Manage team →</div>
          </div>
        ) : (
          <div className="stat-card" onClick={() => hasManager ? navigate('/messages') : null}
            style={{ cursor: hasManager ? 'pointer' : 'default' }}>
            <div className="stat-icon green">
              {hasManager ? <UserCheck size={20} /> : <UserCircle2 size={20} />}
            </div>
            <div className="stat-label">Account Manager</div>
            {hasManager ? (
              <>
                <div className="stat-value" style={{ fontSize: 15, lineHeight: 1.3, marginTop: 4 }}>{accountManager}</div>
                {data?.accountManagerRole && (
                  <div style={{ fontSize: 11, color: '#43A047', fontWeight: 600, marginTop: 2 }}>{data.accountManagerRole}</div>
                )}
                <div className="stat-link">Message →</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', marginTop: 8 }}>No Manager Assigned</div>
                <div style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>Contact admin to assign</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Project Progress Overview</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/projects')}>View All <ArrowRight size={13} /></button>
          </div>
          <div className="card-body">
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <FolderKanban size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                <p>No active projects</p>
              </div>
            ) : projects.slice(0, 6).map(p => (
              <div key={p.id} className="progress-row">
                <span className="progress-label" style={{ fontSize: 12.5 }}>
                  {p.name}
                  {isAdmin && p.client && <span style={{ fontSize: 10, color: '#9CA3AF', display: 'block' }}>{p.client.fullName}</span>}
                </span>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} />
                </div>
                <span className="progress-pct">{p.progressPercent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Content Calendar</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/calendar')}>View Full <ArrowRight size={13} /></button>
          </div>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            {[
              { date: 20, month: 'MAY', title: 'Reel Video', sub: 'Instagram Reel', color: '#1E88E5' },
              { date: 22, month: 'MAY', title: 'Carousel Post', sub: 'Instagram', color: '#F4B400' },
              { date: 24, month: 'MAY', title: 'Ad Campaign', sub: 'Facebook', color: '#1565C0' },
              { date: 26, month: 'MAY', title: 'Blog Post', sub: 'Website', color: '#43A047' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < 3 ? '1px solid #F3F4F6' : 'none' }}>
                <div style={{ textAlign: 'center', flex: '0 0 36px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5 }}>{item.month}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: '#1F2937' }}>{item.date}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7280' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 0.8fr', gap: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Deliverables</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/deliverables')}>View All <ArrowRight size={13} /></button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentDelivs.length === 0 ? (
              <div style={{ padding: '20px', color: '#9CA3AF', textAlign: 'center', fontSize: 13 }}>No deliverables yet</div>
            ) : recentDelivs.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12, borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: 32, height: 32, background: '#EFF6FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E88E5', flexShrink: 0 }}>
                  <Package size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {isAdmin && d.client ? `${d.client.fullName} · ` : ''}{d.monthYear || 'Recent'}
                  </div>
                </div>
                <button className="btn-icon btn" title="Download" onClick={() => handleDownload(d)}><Download size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Approval Requests</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/approvals')}>View All <ArrowRight size={13} /></button>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentApprovals.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No approval requests yet</div>
            ) : recentApprovals.map(a => {
              const sc = {
                PENDING:           { bg: '#FFF8E1', color: '#B45309', label: 'Pending' },
                APPROVED:          { bg: '#E8F5E9', color: '#43A047', label: 'Approved' },
                CHANGES_REQUESTED: { bg: '#FFEBEE', color: '#E53935', label: 'Changes' },
              }[a.status] || { bg: '#FFF8E1', color: '#B45309', label: 'Pending' };
              return (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} />
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                      {isAdmin && a.client && ` · ${a.client.fullName}`}
                    </div>
                  </div>
                  <span style={{ padding: '3px 9px', background: sc.bg, color: sc.color, borderRadius: 99, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Outstanding Payments</div></div>
          <div className="card-body" style={{ textAlign: 'center', padding: '20px 16px' }}>
            {invoice ? (
              <>
                <div style={{ width: 52, height: 52, background: '#FFF8E1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Receipt size={24} color="#F4B400" />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', marginBottom: 4 }}>₹{Number(invoice.amount).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Due this month</div>
                <button className="btn btn-warning btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/invoices')}>View Invoice</button>
              </>
            ) : (
              <>
                <div style={{ width: 52, height: 52, background: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckSquare size={24} color="#43A047" />
                </div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>No Pending Payments</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>You're all set!</div>
              </>
            )}
            <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => navigate('/invoices')}>View All Invoices</button>
          </div>
        </div>

        <div className="promo-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, fontFamily: 'Plus Jakarta Sans' }}>Let's Grow Together!</div>
          <p style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 16, lineHeight: 1.6 }}>We're excited to help your brand reach new heights.</p>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={28} color="white" />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0 4px', color: '#9CA3AF', fontSize: 12, borderTop: '1px solid #E5E7EB', marginTop: 20 }}>
        © 2025 Vignova Marketing. All Rights Reserved. &nbsp;|&nbsp; Privacy Policy &nbsp;|&nbsp; Terms & Conditions
      </div>
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  useEffect(() => {
    dashboardAPI.get()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (d) => {
    try {
      const res = await deliverableAPI.download(d.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = d.name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#1E88E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: '#6B7280', fontSize: 14 }}>Loading dashboard...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page">
      {isTeamMember ? (
        <TeamMemberDashboard data={data} navigate={navigate} handleDownload={handleDownload} />
      ) : (
        <AdminClientDashboard data={data} navigate={navigate} handleDownload={handleDownload} isAdmin={isAdmin} user={user} />
      )}
    </div>
  );
}