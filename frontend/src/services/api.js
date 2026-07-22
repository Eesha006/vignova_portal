import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  generateOtp: (email) => api.post('/auth/otp/generate', { email }),
  verifyOtp: (email, otp) => api.post('/auth/otp/verify', { email, otp }),
  changePassword: (email, newPassword) => api.post('/auth/change-password', { email, newPassword }),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const projectAPI = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  updateProgress: (id, progress) => api.put(`/projects/${id}/progress`, { progress }),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const invoiceAPI = {
  getAll: () => api.get('/invoices'),
  getPending: () => api.get('/invoices/pending'),
  getPaid: () => api.get('/invoices/paid'),
  create: (formData) => api.post('/invoices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  markPaid: (id, paidDate) => api.put(`/invoices/${id}/mark-paid`, null, {
    params: paidDate ? { paidDate } : {},
  }),
  delete: (id) => api.delete(`/invoices/${id}`),
  downloadPdf: (id) => api.get(`/invoices/${id}/download`, { responseType: 'blob' }),
};

export const ticketAPI = {
  getAll: () => api.get('/tickets'),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
};

export const messageAPI = {
  getAll: (withUserId) => api.get('/messages', { params: withUserId ? { withUserId } : {} }),
  send: (data) => api.post('/messages', data),
  getUnreadCount: () => api.get('/messages/unread-count'),
  getContacts: () => api.get('/messages/contacts'),
};

export const calendarAPI = {
  getAll: () => api.get('/calendar'),
  create: (data) => api.post('/calendar', data),
  update: (id, data) => api.put(`/calendar/${id}`, data),
  delete: (id) => api.delete(`/calendar/${id}`),
};

export const deliverableAPI = {
  getAll: () => api.get('/deliverables'),
  upload: (formData) => api.post('/deliverables/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  download: (id) => api.get(`/deliverables/download/${id}`, { responseType: 'blob' }),
};



export const meetingAPI = {
  getAll: () => api.get('/meetings'),
  request: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  schedule: (id, data) => api.put(`/meetings/${id}/schedule`, data),
  checkRoomAccess: (id) => api.get(`/meetings/${id}/room-access`),
  delete: (id) => api.delete(`/meetings/${id}`),
};

export const adminAPI = {
  getClients: () => api.get('/admin/clients'),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
};
export const teamAPI = {
  // Dashboard
  getDashboard: () => api.get('/team/dashboard'),

  // Members
  getMembers: () => api.get('/team/members'),
  getMember: (id) => api.get(`/team/members/${id}`),
  createMember: (data) => api.post('/team/members', data),
  updateMember: (id, data) => api.put(`/team/members/${id}`, data),
  deleteMember: (id) => api.delete(`/team/members/${id}`),

  // Assignments
  getAssignments: () => api.get('/team/assignments'),       // Admin
  getMyAssignments: () => api.get('/team/my-assignments'),  // Team Member
  assignClient: (teamMemberId, clientId) =>
    api.post('/team/assignments', { teamMemberId, clientId }),
  removeAssignment: (teamMemberId, clientId) =>
    api.delete(`/team/assignments/${teamMemberId}/${clientId}`),

  // Tasks
  getTasks: () => api.get('/team/tasks'),
  getMyTasks: () => api.get('/team/tasks/my'),
  getMemberTasks: (memberId) => api.get(`/team/tasks/member/${memberId}`),
  createTask: (data) => api.post('/team/tasks', data),
  updateTask: (id, data) => api.put(`/team/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/team/tasks/${id}`),
};
export const approvalAPI = {
  getAll: () => api.get('/approvals'),

  createWithFile: (formData) =>
    api.post('/approvals/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  clientDecision: (id, data) =>
    api.put(`/approvals/${id}/client-decision`, data),

  update: (id, data) =>
    api.put(`/approvals/${id}`, data),

  delete: (id) =>
    api.delete(`/approvals/${id}`),

  downloadFile: (id) =>
    api.get(`/approvals/${id}/download`, {
      responseType: 'blob',
    }),
};
export const brandAssetAPI = {
  getAll: () => api.get('/brand-assets'),
  upload: (formData) => api.post('/brand-assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/brand-assets/${id}`, data),
  delete: (id) => api.delete(`/brand-assets/${id}`),
  download: (id) => api.get(`/brand-assets/${id}/download`, { responseType: 'blob' }),
};
export const reportAPI = {
  getAll: () => api.get('/reports'),
  getByClient: (clientId) => api.get(`/reports/client/${clientId}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  uploadPdf: (id, formData) => api.post(`/reports/${id}/upload-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadPdf: (id) => api.get(`/reports/${id}/download-pdf`, { responseType: 'blob' }),
  deletePdf: (id) => api.delete(`/reports/${id}/pdf`),
};

export const paymentAPI = {
  getConfig: () => api.get('/payments/config'),
  createOrder: (invoiceId) => api.post(`/payments/create-order/${invoiceId}`),
  verifyPayment: (invoiceId, data) => api.post(`/payments/verify/${invoiceId}`, data),
};
export default api;