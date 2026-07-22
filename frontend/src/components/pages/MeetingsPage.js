import React, { useEffect, useState, useRef } from 'react';
import { meetingAPI, adminAPI, teamAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Video, Plus, AlertCircle, Calendar, Clock,
  Lock, Unlock, Trash2, ExternalLink, Users, Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const typeLabel = (t) => ({ ONE_ON_ONE: '1-on-1 Call', DISCUSSION_SESSION: 'Discussion', REVIEW: 'Review Session' }[t] || t);

const statusClass = (s) => ({
  REQUESTED: 'pending', CONFIRMED: 'in-progress', SCHEDULED: 'in-progress',
  COMPLETED: 'completed', CANCELLED: 'delayed',
}[s] || 'pending');

function MeetingRoom({ meeting, onClose }) {
  const [access, setAccess] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  const check = async () => {
    try { const res = await meetingAPI.checkRoomAccess(meeting.id); setAccess(res.data); }
    catch { setAccess({ access: false, reason: 'Error checking access' }); }
  };

  useEffect(() => { check(); const i = setInterval(check, 10000); return () => clearInterval(i); }, [meeting.id]);

  useEffect(() => {
    if (!access) return;
    const tick = setInterval(() => {
      const now = new Date();
      if (access.scheduledStart && access.scheduledEnd) {
        const start = new Date(access.scheduledStart);
        const end = new Date(access.scheduledEnd);
        if (now < start) {
          const diff = start - now;
          setTimeLeft(`Starts in ${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`);
        } else if (now <= end) {
          const diff = end - now;
          setTimeLeft(`Ends in ${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`);
        } else { setTimeLeft('Meeting ended'); }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [access]);

  const roomUrl = access?.access && access?.roomCode ? `https://meet.jit.si/${access.roomCode}` : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1F2937', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: '#1E88E5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={18} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{meeting.subject}</div>
            <div style={{ color: '#9CA3AF', fontSize: 12 }}>
              {access?.roomCode && `Room: ${access.roomCode}`}{timeLeft && ` · ${timeLeft}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {roomUrl && (
            <a href={roomUrl} target="_blank" rel="noreferrer"
              style={{ padding: '8px 16px', background: '#1E88E5', color: 'white', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={14} />Open in new tab
            </a>
          )}
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#E53935', color: 'white', borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Leave Room
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!access ? (
          <div style={{ color: 'white' }}>Checking access...</div>
        ) : access.access && roomUrl ? (
          <iframe src={roomUrl} allow="camera; microphone; fullscreen; display-capture" style={{ width: '100%', height: '100%', border: 'none' }} title="Meeting Room" />
        ) : (
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={36} color="#9CA3AF" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Room is Locked</div>
            <div style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 8 }}>{access.reason}</div>
            {access.scheduledStart && (
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>
                {format(new Date(access.scheduledStart), 'dd MMM yyyy, hh:mm a')} → {format(new Date(access.scheduledEnd), 'hh:mm a')}
              </div>
            )}
            {timeLeft && (
              <div style={{ marginTop: 16, padding: '10px 24px', background: 'rgba(30,136,229,0.2)', borderRadius: 10, fontSize: 14, color: '#60A5FA', fontWeight: 600 }}>
                {timeLeft}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [form, setForm] = useState({ subject: '', notes: '', meetingType: 'ONE_ON_ONE', preferredDate: '' });
  const [scheduleForm, setScheduleForm] = useState({ scheduledStart: '', scheduledEnd: '', notes: '', participantIds: [] });
  const [updateForm, setUpdateForm] = useState({ status: '', notes: '' });
  const [roomStatus, setRoomStatus] = useState({});
  const isAdmin = user?.role === 'ADMIN';

  const load = async () => {
    meetingAPI.getAll().then(r => setMeetings(r.data)).catch(() => toast.error('Failed to load'));
    if (isAdmin) {
      teamAPI.getMembers().then(r => setTeamMembers(r.data)).catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const checkAll = async () => {
      const scheduled = meetings.filter(m => m.scheduledStart && m.scheduledEnd);
      const results = {};
      for (const m of scheduled) {
        try { const res = await meetingAPI.checkRoomAccess(m.id); results[m.id] = res.data; } catch {}
      }
      setRoomStatus(results);
    };
    if (meetings.length > 0) checkAll();
    const interval = setInterval(checkAll, 30000);
    return () => clearInterval(interval);
  }, [meetings]);

  const handleRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await meetingAPI.request(form);
      if (res.data?.error) { toast.error(res.data.error); return; }
      toast.success('Meeting request submitted!');
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit'); }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleForm.scheduledStart || !scheduleForm.scheduledEnd) { toast.error('Set start and end time'); return; }
    try {
      await meetingAPI.schedule(selected.id, {
        scheduledStart: scheduleForm.scheduledStart + ':00',
        scheduledEnd: scheduleForm.scheduledEnd + ':00',
        notes: scheduleForm.notes,
        participantIds: scheduleForm.participantIds,
      });
      toast.success('Meeting scheduled! Room opens at the set time.');
      setShowScheduleModal(false); load();
    } catch { toast.error('Failed to schedule meeting'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try { await meetingAPI.update(selected.id, updateForm); toast.success('Updated!'); setShowUpdateModal(false); load(); }
    catch { toast.error('Failed to update'); }
  };

  const handleUpdateParticipants = async (meetingId, ids) => {
    try {
      await meetingAPI.updateParticipants(meetingId, ids);
      toast.success('Participants updated!'); load();
    } catch { toast.error('Failed to update participants'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting?')) return;
    try { await meetingAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const toggleParticipant = (id) => {
    setScheduleForm(p => ({
      ...p,
      participantIds: p.participantIds.includes(id)
        ? p.participantIds.filter(pid => pid !== id)
        : [...p.participantIds, id],
    }));
  };

  const getRoomBtn = (m) => {
    if (!m.scheduledStart || !m.scheduledEnd) return { label: 'Not Scheduled', disabled: true, color: '#9CA3AF', bg: '#F3F4F6' };
    const s = roomStatus[m.id];
    if (!s) return { label: 'Checking...', disabled: true, color: '#9CA3AF', bg: '#F3F4F6' };
    if (s.access) return { label: 'Join Meeting', disabled: false, color: 'white', bg: '#43A047' };
    const now = new Date();
    if (now < new Date(m.scheduledStart)) return { label: `Opens ${formatDistanceToNow(new Date(m.scheduledStart), { addSuffix: true })}`, disabled: true, color: '#6B7280', bg: '#F3F4F6' };
    return { label: 'Meeting Ended', disabled: true, color: '#6B7280', bg: '#F3F4F6' };
  };

  return (
    <div className="page">
      {activeRoom && <MeetingRoom meeting={activeRoom} onClose={() => { setActiveRoom(null); load(); }} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Quick Meet-Up</div>
          <div className="page-subtitle">Private meeting rooms — open only at the scheduled time</div>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => { setForm({ subject: '', notes: '', meetingType: 'ONE_ON_ONE', preferredDate: '' }); setShowModal(true); }}>
            <Plus size={16} />Request Meeting
          </button>
        )}
      </div>

      {!isAdmin && (
        <div style={{ background: '#E3F2FD', border: '1px solid #BBDEFB', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#1E88E5" />
          <span style={{ fontSize: 13, color: '#1565C0' }}>The <strong>Join Meeting</strong> button activates only during the scheduled time window.</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Requested', val: meetings.filter(m => m.status === 'REQUESTED').length, color: '#F4B400', bg: '#FFF8E1' },
          { label: 'Scheduled', val: meetings.filter(m => m.status === 'SCHEDULED' || m.status === 'CONFIRMED').length, color: '#1E88E5', bg: '#E3F2FD' },
          { label: 'Completed', val: meetings.filter(m => m.status === 'COMPLETED').length, color: '#43A047', bg: '#E8F5E9' },
          { label: 'Cancelled', val: meetings.filter(m => m.status === 'CANCELLED').length, color: '#E53935', bg: '#FFEBEE' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: bg, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color }}>{val}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Meeting cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {meetings.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state"><Video size={36} /><h3>No meetings yet</h3></div>
          </div>
        ) : meetings.map(m => {
          const btn = getRoomBtn(m);
          const isLive = roomStatus[m.id]?.access === true;
          return (
            <div key={m.id} className="card" style={{ padding: 20, border: isLive ? '2px solid #43A047' : '1px solid #E5E7EB' }}>
              {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43A047', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#43A047', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Now</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{m.subject}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{typeLabel(m.meetingType)}</div>
                  <span className={`status ${statusClass(m.status)}`}>{m.status?.replace('_', ' ')}</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {(m.status === 'REQUESTED' || m.status === 'CONFIRMED') && (
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        setSelected(m);
                        setScheduleForm({ scheduledStart: '', scheduledEnd: '', notes: m.notes || '', participantIds: m.participants?.map(p => p.id) || [] });
                        setShowScheduleModal(true);
                      }}>
                        <Calendar size={13} />Schedule
                      </button>
                    )}
                    <button className="btn btn-icon btn-sm" onClick={() => {
                      setSelected(m);
                      setUpdateForm({ status: m.status, notes: m.notes || '' });
                      setShowUpdateModal(true);
                    }}><Clock size={13} /></button>
                    <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }} onClick={() => handleDelete(m.id)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>

              {isAdmin && m.client && (
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#1E88E5,#43A047)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>
                    {m.client.fullName?.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 600 }}>{m.client.fullName}</span>
                  {m.client.companyName && <span style={{ color: '#9CA3AF' }}>· {m.client.companyName}</span>}
                </div>
              )}

              {/* Participants */}
              {m.participants?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Participants</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.participants.map(p => (
                      <span key={p.id} style={{ padding: '3px 10px', background: '#E8F5E9', color: '#43A047', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {m.scheduledStart && m.scheduledEnd && (
                <div style={{ background: '#F8FAFC', borderRadius: 9, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Scheduled Window</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{format(new Date(m.scheduledStart), 'dd MMM yyyy')}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{format(new Date(m.scheduledStart), 'hh:mm a')} → {format(new Date(m.scheduledEnd), 'hh:mm a')}</div>
                </div>
              )}

              {isLive && roomStatus[m.id]?.roomCode && (
                <div style={{ background: '#E8F5E9', borderRadius: 9, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Unlock size={14} color="#43A047" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#43A047' }}>Room: {roomStatus[m.id].roomCode}</span>
                </div>
              )}
              {!isLive && m.scheduledStart && (
                <div style={{ background: '#F3F4F6', borderRadius: 9, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={14} color="#9CA3AF" />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Room locked until scheduled time</span>
                </div>
              )}

              {m.notes && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{m.notes}</div>}

              <button disabled={btn.disabled} onClick={() => !btn.disabled && setActiveRoom(m)}
                style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none', cursor: btn.disabled ? 'not-allowed' : 'pointer', background: btn.bg, color: btn.color, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: btn.disabled ? 0.7 : 1 }}>
                <Video size={15} />{btn.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Client request modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Request a Meeting</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Monthly Campaign Review" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Meeting Type</label>
                    <select className="form-control" value={form.meetingType} onChange={e => setForm(p => ({ ...p, meetingType: e.target.value }))}>
                      <option value="ONE_ON_ONE">1-on-1 Call</option>
                      <option value="DISCUSSION_SESSION">Discussion Session</option>
                      <option value="REVIEW">Review Session</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferred Date & Time</label>
                    <input type="datetime-local" className="form-control" value={form.preferredDate} onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Topics you'd like to discuss..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Video size={14} />Request Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin schedule modal with participants */}
      {showScheduleModal && selected && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Schedule Meeting — {selected.subject}</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSchedule}>
              <div className="modal-body">
                <div style={{ background: '#E3F2FD', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1565C0' }}>
                  <strong>Client:</strong> {selected.client?.fullName} {selected.preferredDate && `· Prefers: ${format(new Date(selected.preferredDate), 'dd MMM yyyy, hh:mm a')}`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Start Date & Time *</label>
                    <input type="datetime-local" className="form-control" required value={scheduleForm.scheduledStart} onChange={e => setScheduleForm(p => ({ ...p, scheduledStart: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date & Time *</label>
                    <input type="datetime-local" className="form-control" required value={scheduleForm.scheduledEnd} onChange={e => setScheduleForm(p => ({ ...p, scheduledEnd: e.target.value }))} />
                  </div>
                </div>

                {/* Team member participants */}
                {teamMembers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} />Invite Team Members (optional)
                    </label>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                      {teamMembers.map(tm => {
                        const selected_ = scheduleForm.participantIds.includes(tm.id);
                        return (
                          <div key={tm.id}
                            onClick={() => toggleParticipant(tm.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: selected_ ? '#E8F5E9' : 'white', borderBottom: '1px solid #F3F4F6', transition: 'all 0.15s' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#43A047,#1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {tm.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{tm.name}</div>
                              <div style={{ fontSize: 12, color: '#6B7280' }}>{tm.role}</div>
                            </div>
                            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${selected_ ? '#43A047' : '#D1D5DB'}`, background: selected_ ? '#43A047' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {selected_ && <Check size={13} color="white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                      Selected: Admin + Client {scheduleForm.participantIds.length > 0 && `+ ${scheduleForm.participantIds.length} team member(s)`}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Notes for Participants</label>
                  <textarea className="form-control" rows={2} value={scheduleForm.notes} onChange={e => setScheduleForm(p => ({ ...p, notes: e.target.value }))} placeholder="Agenda or any info..." />
                </div>
                <div style={{ background: '#FFF8E1', borderRadius: 9, padding: '10px 14px', fontSize: 12.5, color: '#92400E' }}>
                  A unique room code is auto-generated. The Join Meeting button unlocks only during the scheduled window for Admin, Client, and invited team members.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Calendar size={14} />Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin update modal */}
      {showUpdateModal && selected && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Update Meeting</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowUpdateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={updateForm.status} onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="REQUESTED">Requested</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={updateForm.notes} onChange={e => setUpdateForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}