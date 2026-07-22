import React, { useEffect, useState } from 'react';
import { invoiceAPI, adminAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, FileDown, CheckCircle, Receipt,
  Trash2, Upload, CreditCard, IndianRupee
} from 'lucide-react';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paidDate, setPaidDate] = useState('');
  const [tab, setTab] = useState('all');
  const [pdfFile, setPdfFile] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';

  const [form, setForm] = useState({
    invoiceNumber: '', amount: '', description: '',
    monthYear: '', status: 'PENDING', dueDate: '', clientId: '',
  });

  const load = () => {
    invoiceAPI.getAll()
      .then(r => setInvoices(r.data || []))
      .catch(() => toast.error('Failed to load invoices'));
    if (isAdmin) {
      adminAPI.getClients().then(r => setClients(r.data || [])).catch(() => {});
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = tab === 'all' ? invoices
    : tab === 'paid' ? invoices.filter(i => i.status === 'PAID')
    : invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');

  const pendingTotal = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidTotal = invoices
    .filter(i => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const openNewModal = () => {
    setForm({
      invoiceNumber: `INV-${Date.now()}`,
      amount: '', description: '', monthYear: '',
      status: 'PENDING', dueDate: '', clientId: '',
    });
    setPdfFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Please select a client'); return; }
    try {
      const fd = new FormData();
      fd.append('invoiceNumber', form.invoiceNumber);
      fd.append('amount', form.amount);
      fd.append('clientId', form.clientId);
      fd.append('description', form.description);
      fd.append('monthYear', form.monthYear);
      fd.append('status', form.status);
      if (form.dueDate) fd.append('dueDate', form.dueDate);
      if (pdfFile) fd.append('file', pdfFile);
      await invoiceAPI.create(fd);
      toast.success('Invoice created!');
      setShowModal(false);
      load();
    } catch { toast.error('Failed to create invoice'); }
  };

  const openMarkPaid = (inv) => {
    setSelectedInvoice(inv);
    setPaidDate(new Date().toISOString().slice(0, 16));
    setShowMarkPaidModal(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      await invoiceAPI.markPaid(selectedInvoice.id,
        paidDate ? paidDate + ':00' : null);
      toast.success('Invoice marked as paid!');
      setShowMarkPaidModal(false);
      load();
    } catch { toast.error('Failed to mark as paid'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoiceAPI.delete(id);
      toast.success('Invoice deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDownload = async (inv) => {
    if (!inv.filePath) {
      toast.error('No PDF uploaded for this invoice');
      return;
    }
    try {
      const res = await invoiceAPI.downloadPdf(inv.id);
      const url = URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${inv.invoiceNumber}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  };

  // ── Razorpay Payment ────────────────────────────────────────────────────
  const handleRazorpayPayment = async (inv) => {
    setPayingId(inv.id);
    try {
      // Get order from backend
      const res = await paymentAPI.createOrder(inv.id);
      const { orderId, amount, currency, keyId,
              invoiceNumber, clientName, clientEmail } = res.data;

      // Check if Razorpay script loaded
      if (!window.Razorpay) {
        toast.error('Razorpay is not loaded. Please refresh and try again.');
        setPayingId(null);
        return;
      }

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'Vignova Marketing',
        description: `Invoice ${invoiceNumber}`,
        image: '', // optional logo URL
        order_id: orderId,
        prefill: {
          name: clientName,
          email: clientEmail,
        },
        theme: {
          color: '#1E88E5',
        },
        handler: async (response) => {
          // Payment succeeded — verify on backend
          try {
            const verifyRes = await paymentAPI.verifyPayment(inv.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success(`✅ Payment successful! Invoice ${invoiceNumber} paid.`);
              load();
            } else {
              toast.error('Payment verification failed. Contact support.');
            }
          } catch (err) {
            toast.error(err.response?.data?.error || 'Verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled.', { icon: 'ℹ️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    }
    setPayingId(null);
  };

  const statusClass = (s) => ({
    PAID: 'completed', PENDING: 'pending', OVERDUE: 'delayed',
  }[s] || 'pending');

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">Bills & Invoices</div>
          <div className="page-subtitle">
            Payment history, current invoices and outstanding dues
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={16} />New Invoice
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: '#E8F5E9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} color="#43A047" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Total Paid</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: '#43A047' }}>
                ₹{paidTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: '#FFF8E1', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={22} color="#F4B400" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Outstanding</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans', color: pendingTotal > 0 ? '#F4B400' : '#43A047' }}>
                {pendingTotal > 0 ? `₹${pendingTotal.toLocaleString('en-IN')}` : 'No Pending'}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: '#E3F2FD', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={22} color="#1E88E5" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Total Invoices</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Plus Jakarta Sans' }}>
                {invoices.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['all', 'paid', 'pending'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: tab === t ? 'white' : 'transparent', color: tab === t ? '#1E88E5' : '#6B7280', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {t === 'all' ? 'All Invoices' : t === 'paid' ? 'Paid' : 'Pending / Overdue'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                {isAdmin && <th>Client</th>}
                <th>Description</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>
                    {tab === 'pending'
                      ? "✅ No Pending Payments. You're all set!"
                      : 'No invoices found.'}
                  </td>
                </tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 700, color: '#1E88E5' }}>{inv.invoiceNumber}</td>
                  {isAdmin && <td style={{ fontSize: 13 }}>{inv.client?.fullName || '—'}</td>}
                  <td style={{ fontSize: 13, color: '#6B7280' }}>{inv.description || '—'}</td>
                  <td style={{ fontSize: 13 }}>{inv.monthYear || '—'}</td>
                  <td style={{ fontWeight: 700, fontSize: 15 }}>₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`status ${statusClass(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#6B7280' }}>
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ fontSize: 13, color: inv.paidDate ? '#43A047' : '#9CA3AF', fontWeight: inv.paidDate ? 600 : 400 }}>
                    {inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-icon btn-sm"
                        title={inv.filePath ? 'Download PDF' : 'No PDF'}
                        style={{ opacity: inv.filePath ? 1 : 0.35 }}
                        onClick={() => handleDownload(inv)}>
                        <FileDown size={14} />
                      </button>

                      {/* Razorpay Pay Now — client only, pending invoices */}
                      {isClient && inv.status !== 'PAID' && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={payingId === inv.id}
                          onClick={() => handleRazorpayPayment(inv)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CreditCard size={13} />
                          {payingId === inv.id ? 'Opening...' : 'Pay Now'}
                        </button>
                      )}

                      {/* Admin — mark paid manually */}
                      {isAdmin && inv.status !== 'PAID' && (
                        <button className="btn btn-sm"
                          style={{ background: '#E8F5E9', color: '#43A047', border: '1px solid #C8E6C9', fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                          onClick={() => openMarkPaid(inv)}>
                          Mark Paid
                        </button>
                      )}

                      {isAdmin && (
                        <button className="btn btn-icon btn-sm" style={{ color: '#E53935' }}
                          onClick={() => handleDelete(inv.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Create Invoice</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Invoice Number</label>
                    <input className="form-control" required value={form.invoiceNumber}
                      onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" className="form-control" required value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="24500" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Month / Year</label>
                    <input className="form-control" value={form.monthYear}
                      onChange={e => setForm(p => ({ ...p, monthYear: e.target.value }))}
                      placeholder="May 2025" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="datetime-local" className="form-control" value={form.dueDate}
                      onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-control" required value={form.clientId}
                    onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} — {c.companyName || c.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Social media management — May 2025" />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Invoice PDF (optional)</label>
                  <input type="file" accept=".pdf" className="form-control"
                    style={{ padding: 8 }}
                    onChange={e => setPdfFile(e.target.files[0])} />
                  {pdfFile && (
                    <div style={{ fontSize: 12, color: '#43A047', marginTop: 6 }}>
                      ✓ {pdfFile.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Upload size={14} />Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showMarkPaidModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowMarkPaidModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Mark Invoice as Paid</div>
              <button className="btn btn-icon btn-sm" onClick={() => setShowMarkPaidModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMarkPaid}>
              <div className="modal-body">
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>Invoice</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedInvoice.invoiceNumber}</div>
                  <div style={{ fontSize: 14, color: '#43A047', fontWeight: 700, marginTop: 4 }}>
                    ₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Received Date *</label>
                  <input type="datetime-local" className="form-control" required
                    value={paidDate} onChange={e => setPaidDate(e.target.value)} />
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                    This date will be visible to the client
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowMarkPaidModal(false)}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#43A047', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <CheckCircle size={15} />Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}