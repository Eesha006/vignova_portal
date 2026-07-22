import React, { useEffect, useState, useRef } from 'react';
import { messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Paperclip, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';

  const loadContacts = async () => {
    try {
      const res = await messageAPI.getContacts();
      setContacts(res.data || []);
      // Auto-select first contact
      if (res.data?.length > 0 && !selectedContact) {
        setSelectedContact(res.data[0]);
      }
    } catch { toast.error('Failed to load contacts'); }
  };

  const loadMessages = async (contactId) => {
    try {
      const res = await messageAPI.getAll(contactId);
      setMessages(res.data || []);
    } catch {}
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
      const interval = setInterval(() => loadMessages(selectedContact.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedContact) return;
    try {
      await messageAPI.send({ content: content.trim(), receiverId: selectedContact.id });
      setContent('');
      loadMessages(selectedContact.id);
    } catch { toast.error('Failed to send message'); }
  };

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const filteredContacts = contacts.filter(c =>
    c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isTeamMember = (contact) => contact?.companyName === 'Vignova Team';

  return (
    <div className="page" style={{ height: 'calc(100vh - 92px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-title" style={{ marginBottom: 4 }}>Communication Center</div>
      <div className="page-subtitle" style={{ marginBottom: 16 }}>Direct messaging with your Vignova team</div>

      <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>

        {/* Contacts sidebar */}
        <div className="card" style={{ width: 280, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
              {isAdmin ? 'Clients & Team' : 'Messages'}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', borderRadius: 8, padding: '7px 10px', border: '1px solid #E5E7EB' }}>
                <Search size={13} color="#9CA3AF" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'inherit', flex: 1 }}
                />
              </div>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredContacts.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>No contacts found</div>
            ) : filteredContacts.map(c => {
              const team = isTeamMember(c);
              return (
                <div key={c.id}
                  onClick={() => { setSelectedContact(c); loadMessages(c.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', cursor: 'pointer',
                    background: selectedContact?.id === c.id ? '#EFF6FF' : 'transparent',
                    borderLeft: selectedContact?.id === c.id ? '3px solid #1E88E5' : '3px solid transparent',
                    borderBottom: '1px solid #F9FAFB',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: team
                      ? 'linear-gradient(135deg, #43A047, #1565C0)'
                      : 'linear-gradient(135deg, #1E88E5, #43A047)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 14,
                  }}>
                    {initials(c.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.fullName}
                    </div>
                    <div style={{ fontSize: 11.5, color: team ? '#43A047' : '#9CA3AF', fontWeight: team ? 600 : 400 }}>
                      {team ? '🟢 Team Member' : (c.companyName || c.email)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedContact ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9CA3AF' }}>
              <MessageSquare size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Select a contact to start messaging</div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: isTeamMember(selectedContact)
                    ? 'linear-gradient(135deg, #43A047, #1565C0)'
                    : 'linear-gradient(135deg, #1E88E5, #43A047)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 15,
                }}>
                  {initials(selectedContact.fullName)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedContact.fullName}</div>
                  <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#43A047' }} />
                    <span style={{ color: '#43A047', fontWeight: 600 }}>Online</span>
                    {isTeamMember(selectedContact) && (
                      <span style={{ color: '#9CA3AF', marginLeft: 6 }}>· Team Member</span>
                    )}
                    {!isTeamMember(selectedContact) && selectedContact.companyName && (
                      <span style={{ color: '#9CA3AF', marginLeft: 6 }}>· {selectedContact.companyName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 20px' }}>
                    <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.2, display: 'block' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No messages yet</div>
                    <div style={{ fontSize: 13 }}>Send a message to start the conversation</div>
                  </div>
                ) : messages.map(m => {
                  const isMine = m.sender?.email === user?.email;
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      {!isMine && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 4, paddingLeft: 4 }}>
                          {m.sender?.fullName}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '68%', padding: '10px 14px', borderRadius: 14,
                        fontSize: 13.5, lineHeight: 1.5,
                        background: isMine ? '#1E88E5' : '#F3F4F6',
                        color: isMine ? 'white' : '#1F2937',
                        borderBottomRightRadius: isMine ? 4 : 14,
                        borderBottomLeftRadius: isMine ? 14 : 4,
                      }}>
                        {m.content}
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                          {m.createdAt ? format(new Date(m.createdAt), 'hh:mm a') : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="btn btn-icon" title="Attach file"><Paperclip size={16} /></button>
                <input
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  placeholder={`Message ${selectedContact.fullName}...`}
                  style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#F8FAFC' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }} disabled={!content.trim()}>
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}