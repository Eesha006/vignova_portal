import React, { useEffect, useState } from 'react';
import { teamAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users, Plus, Edit2, Trash2, UserCheck, Briefcase,
  CheckSquare, AlertCircle, TrendingUp, X, ChevronRight,
  Clock, Star, Activity
} from 'lucide-react';

const workloadColor = (pct) => {
  if (pct <= 40) return { color: '#43A047', bg: '#E8F5E9', label: 'Available' };
  if (pct <= 70) return { color: '#F4B400', bg: '#FFF8E1', label: 'Moderate' };
  return { color: '#E53935', bg: '#FFEBEE', label: 'High Load' };
};

const taskStatusColor = {
  NOT_STARTED: { bg: '#F3F4F6', color: '#6B7280' },
  IN_PROGRESS: { bg: '#E3F2FD', color: '#1E88E5' },
  REVIEW_PENDING: { bg: '#FFF8E1', color: '#F4B400' },
  COMPLETED: { bg: '#E8F5E9', color: '#43A047' },
  OVERDUE: { bg: '#FFEBEE', color: '#E53935' },
};

export default function TeamManagementPage() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: '', phoneNumber: '', password: 'Team@123' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedToId: '', clientId: '', dueDate: '', status: 'NOT_STARTED' });
  const [assignForm, setAssignForm] = useState({ teamMemberId: '', clientId: '' });

  const load = async () => {
    try {
      const [d, m, t, a, c] = await Promise.all([
        teamAPI.getDashboard(), teamAPI.getMembers(), teamAPI.getTasks(),
        teamAPI.getAssignments(), adminAPI.getClients()
      ]);
      setStats(d.data);
      setMembers(m.data);
      setTasks(t.data);
      setAssignments(a.data);
      setClients(c.data);
    } catch { toast.error('Failed to load team data'); }
  };

  useEffect(() => { load(); }, []);

  const loadMemberProfile = async (id) => {
    try {
      const res = await teamAPI.getMember(id);
      setMemberProfile(res.data);
      setTab('profile');
    } catch { toast.error('Failed to load profile'); }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) await teamAPI.updateMember(editingMember.id, memberForm);
      else await teamAPI.createMember(memberForm);
      toast.success(editingMember ? 'Member updated!' : 'Member added!');
      setShowMemberModal(false); load();
    } catch { toast.error('Failed to save member'); }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Delete this team member? All their tasks and assignments will also be removed.')) return;
    try { await teamAPI.deleteMember(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...taskForm };
      if (!payload.dueDate) delete payload.dueDate;
      if (!payload.clientId) delete payload.clientId;
      if (editingTask) await teamAPI.updateTask(editingTask.id, payload);
      else await teamAPI.createTask(payload);
      toast.success(editingTask ? 'Task updated!' : 'Task created!');
      setShowTaskModal(false); load();
    } catch { toast.error('Failed to save task'); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete task?')) return;
    try { await teamAPI.deleteTask(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await teamAPI.assignClient(parseInt(assignForm.teamMemberId), parseInt(assignForm.clientId));
      toast.success('Client assigned!');
      setShowAssignModal(false); load();
    } catch { toast.error('Already assigned or failed'); }
  };

  const handleRemoveAssignment = async (teamMemberId, clientId) => {
    if (!window.confirm('Remove this client assignment?')) return;
    try { await teamAPI.removeAssignment(teamMemberId, clientId); toast.success('Removed'); load(); }
    catch { toast.error('Failed to remove'); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Team Members' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'assignments', label: 'Client Assignments' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Team Management</div>
          <div className="page-subtitle">Monitor workloads, tasks, and client assignments</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => { setShowAssignModal(true); setAssignForm({ teamMemberId: '', clientId: '' }); }}>
            <UserCheck size={15} />Assign Client
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingMember(null); setMemberForm({ name: '', email: '', role: '', phoneNumber: '', password: 'Team@123' }); setShowMemberModal(true); }}>
            <Plus size={15} />Add Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: tab === t.id ? 'white' : 'transparent', color: tab === t.id ? '#1E88E5' : '#6B7280', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
        {memberProfile && (
          <button onClick={() => setTab('profile')}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: tab === 'profile' ? 'white' : 'transparent', color: tab === 'profile' ? '#1E88E5' : '#6B7280', boxShadow: tab === 'profile' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {memberProfile.member?.name}
          </button>
        )}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Members', value: stats.totalMembers || 0, icon: Users, color: '#1E88E5', bg: '#E3F2FD' },
              { label: 'Active Members', value: stats.activeMembers || 0, icon: UserCheck, color: '#43A047', bg: '#E8F5E9' },
              { label: 'Tasks In Progress', value: stats.tasksInProgress || 0, icon: Briefcase, color: '#F4B400', bg: '#FFF8E1' },
              { label: 'Tasks Completed', value: stats.tasksCompleted || 0, icon: CheckSquare, color: '#43A047', bg: '#E8F5E9' },
              { label: 'Overdue Tasks', value: stats.tasksOverdue || 0, icon: AlertCircle, color: '#E53935', bg: '#FFEBEE' },
              { label: 'Client Assignments', value: stats.totalAssignments || 0, icon: UserCheck, color: '#1565C0', bg: '#E3F2FD' },
              { label: 'Team Utilization', value: `${stats.utilizationPercent || 0}%`, icon: TrendingUp, color: '#43A047', bg: '#E8F5E9' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, background: bg, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{value}</div>
                  <div style={{ fontSize: 12.5, color: '#6B7280' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Workload Monitor */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-header"><div className="card-title">Team Workload Monitor</div></div>
            <div className="card-body">
              {members.length === 0 ? (
                <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>No team members yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {members.map(m => {
                    const wl = workloadColor(m.workloadPercent);
                    return (
                      <div key={m.id} style={{ padding: '14px 16px', border: `1px solid ${wl.color}30`, borderRadius: 12, background: wl.bg + '60' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${wl.color}, #1E88E5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                              {m.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                              <div style={{ fontSize: 11, color: '#6B7280' }}>{m.role}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: wl.color, background: wl.bg, padding: '3px 8px', borderRadius: 99 }}>{wl.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="progress-bar-wrap" style={{ flex: 1 }}>
                            <div className="progress-bar-fill" style={{ width: `${m.workloadPercent}%`, background: wl.color }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: wl.color }}>{m.workloadPercent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div className="card-header"><div className="card-title">Recent Activity</div></div>
            <div className="card-body">
              {(stats.recentActivity || []).length === 0 ? (
                <div style={{ color: '#9CA3AF', textAlign: 'center' }}>No recent activity</div>
              ) : (stats.recentActivity || []).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14, borderBottom: '1px solid #F3F4F6', marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, background: '#E3F2FD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={14} color="#1E88E5" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.assignedTo?.name || 'Team'} — {t.title}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Status: {t.status?.replace('_', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── MEMBERS ── */}
      {tab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {members.length === 0 ? (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state"><Users size={36} /><h3>No team members yet</h3><p>Add your first team member using the button above</p></div>
            </div>
          ) : members.map(m => {
            const wl = workloadColor(m.workloadPercent);
            const memberAssignments = assignments.filter(a => a.teamMember?.id === m.id);
            return (
              <div key={m.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #1E88E5, #43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>
                      {m.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{m.role}</div>
                      <span className={`status ${m.status === 'ACTIVE' ? 'completed' : 'delayed'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => loadMemberProfile(m.id)} title="View Profile"><ChevronRight size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingMember(m); setMemberForm({ name: m.name, email: m.email, role: m.role, phoneNumber: m.phoneNumber || '', password: '' }); setShowMemberModal(true); }}><Edit2 size={14} /></button>
                    <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDeleteMember(m.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 6 }}>{m.email}</div>
                {m.phoneNumber && <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 10 }}>{m.phoneNumber}</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Clients: <strong>{memberAssignments.length}</strong></span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Tasks: <strong>{tasks.filter(t => t.assignedTo?.id === m.id).length}</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="progress-bar-wrap" style={{ flex: 1 }}>
                    <div className="progress-bar-fill" style={{ width: `${m.workloadPercent}%`, background: wl.color }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: wl.color }}>{m.workloadPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TASKS ── */}
      {tab === 'tasks' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', assignedToId: '', clientId: '', dueDate: '', status: 'NOT_STARTED' }); setShowTaskModal(true); }}>
              <Plus size={15} />New Task
            </button>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Task</th><th>Assigned To</th><th>Client</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No tasks yet</td></tr>
                  ) : tasks.map(t => {
                    const sc = taskStatusColor[t.status] || taskStatusColor.NOT_STARTED;
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{t.description}</div>}
                        </td>
                        <td>{t.assignedTo?.name || '—'}</td>
                        <td>{t.client?.fullName || '—'}</td>
                        <td>
                          <span style={{ padding: '3px 10px', background: sc.bg, color: sc.color, borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                            {t.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: '#6B7280' }}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-icon btn-sm" onClick={() => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description || '', assignedToId: t.assignedTo?.id || '', clientId: t.client?.id || '', dueDate: t.dueDate ? t.dueDate.substring(0, 16) : '', status: t.status }); setShowTaskModal(true); }}><Edit2 size={14} /></button>
                            <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDeleteTask(t.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── ASSIGNMENTS ── */}
      {tab === 'assignments' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Client</th><th>Assigned Team Member</th><th>Assigned Date</th><th>Remove</th></tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No assignments yet</td></tr>
                ) : assignments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.client?.fullName}<div style={{ fontSize: 12, color: '#9CA3AF' }}>{a.client?.companyName}</div></td>
                    <td>{a.teamMember?.name}<div style={{ fontSize: 12, color: '#9CA3AF' }}>{a.teamMember?.role}</div></td>
                    <td style={{ fontSize: 13, color: '#6B7280' }}>{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleRemoveAssignment(a.teamMember?.id, a.client?.id)}><X size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PERFORMANCE ── */}
      {tab === 'performance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {members.map(m => {
            const memberTasks = tasks.filter(t => t.assignedTo?.id === m.id);
            const completed = memberTasks.filter(t => t.status === 'COMPLETED').length;
            const overdue = memberTasks.filter(t => t.status === 'OVERDUE').length;
            const inProgress = memberTasks.filter(t => t.status === 'IN_PROGRESS').length;
            const total = memberTasks.length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const wl = workloadColor(m.workloadPercent);
            return (
              <div key={m.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 17 }}>
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{m.role}</div>
                  </div>
                </div>
                {[
                  { label: 'Tasks Completed', value: completed, color: '#43A047' },
                  { label: 'In Progress', value: inProgress, color: '#1E88E5' },
                  { label: 'Overdue', value: overdue, color: '#E53935' },
                  { label: 'Completion Rate', value: `${completionRate}%`, color: '#F4B400' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Workload</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${m.workloadPercent}%`, background: wl.color }} />
                  </div>
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state"><Star size={36} /><h3>No performance data yet</h3><p>Add team members and tasks to see performance</p></div>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBER PROFILE ── */}
      {tab === 'profile' && memberProfile && (
        <div>
          <div className="card" style={{ marginBottom: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 28 }}>
                {memberProfile.member?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans' }}>{memberProfile.member?.name}</div>
                <div style={{ fontSize: 14, color: '#6B7280' }}>{memberProfile.member?.role} · {memberProfile.member?.email}</div>
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>{memberProfile.member?.phoneNumber}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            {[
              { label: 'Assigned Clients', value: memberProfile.assignedClients?.length || 0, color: '#1E88E5' },
              { label: 'Active Tasks', value: memberProfile.activeTasks?.length || 0, color: '#F4B400' },
              { label: 'Completed Tasks', value: memberProfile.completedTasks?.length || 0, color: '#43A047' },
              { label: 'Overdue Tasks', value: memberProfile.overdueTasks?.length || 0, color: '#E53935' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{value}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Client Projects</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Client</th><th>Project</th><th>Progress</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(memberProfile.clientProjects || []).flatMap(cp =>
                    cp.projects?.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{cp.client?.fullName}</td>
                        <td>{p.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="progress-bar-wrap" style={{ flex: 1, maxWidth: 120 }}>
                              <div className="progress-bar-fill" style={{ width: `${p.progressPercent}%` }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{p.progressPercent}%</span>
                          </div>
                        </td>
                        <td><span className={`status ${p.status === 'COMPLETED' ? 'completed' : p.status === 'IN_PROGRESS' ? 'in-progress' : 'pending'}`}>{p.status?.replace('_', ' ')}</span></td>
                      </tr>
                    )) || []
                  )}
                  {(memberProfile.clientProjects || []).every(cp => !cp.projects?.length) && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No projects found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MEMBER MODAL ── */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingMember ? 'Edit Member' : 'Add Team Member'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMemberSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" required value={memberForm.name} onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))} placeholder="Sneha Sharma" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" required value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} placeholder="sneha@vignova.com" disabled={!!editingMember} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <input className="form-control" value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="Account Manager" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" value={memberForm.phoneNumber} onChange={e => setMemberForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+91 9876543210" />
                  </div>
                </div>
                {!editingMember && (
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" className="form-control" value={memberForm.password} onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))} placeholder="Default: Team@123" />
                  </div>
                )}
                {editingMember && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-control" value={memberForm.status || 'ACTIVE'} onChange={e => setMemberForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Workload %</label>
                      <input type="number" min={0} max={100} className="form-control" value={memberForm.workloadPercent || 0} onChange={e => setMemberForm(p => ({ ...p, workloadPercent: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingMember ? 'Update' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK MODAL ── */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingTask ? 'Edit Task' : 'New Task'}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input className="form-control" required value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Create Instagram reels for May" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Assign To *</label>
                    <select className="form-control" required value={taskForm.assignedToId} onChange={e => setTaskForm(p => ({ ...p, assignedToId: e.target.value }))}>
                      <option value="">Select member...</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client</label>
                    <select className="form-control" value={taskForm.clientId} onChange={e => setTaskForm(p => ({ ...p, clientId: e.target.value }))}>
                      <option value="">Select client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}>
                      {['NOT_STARTED', 'IN_PROGRESS', 'REVIEW_PENDING', 'COMPLETED', 'OVERDUE'].map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="datetime-local" className="form-control" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'} Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN CLIENT MODAL ── */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Assign Client to Team Member</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Team Member *</label>
                  <select className="form-control" required value={assignForm.teamMemberId} onChange={e => setAssignForm(p => ({ ...p, teamMemberId: e.target.value }))}>
                    <option value="">Select member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-control" required value={assignForm.clientId} onChange={e => setAssignForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.fullName} — {c.companyName || c.email}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><UserCheck size={14} />Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}