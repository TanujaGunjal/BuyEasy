import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const statusColor = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dcfce7', text: '#166534' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};

const PendingApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/pending-approvals');
      setApprovals(res.data.data);
    } catch {
      setError('Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, action) => {
    // Disable both buttons immediately — UI-side double-submit prevention
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      await api.put(`/admin/pending-approvals/${id}/${action}`);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${action}`;
      setError(msg);
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) return <div style={styles.center}>Loading…</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Pending Refund Approvals</h1>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {approvals.length === 0 ? (
        <div style={styles.empty}>No pending refund requests.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Order ID', 'User', 'Amount', 'Reason', 'Requested At', 'Actions'].map(
                  (h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a._id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.code}>{a.orderId}</code>
                  </td>
                  <td style={styles.td}>
                    <div>{a.userId?.name || '—'}</div>
                    <div style={styles.email}>{a.userId?.email || ''}</div>
                  </td>
                  <td style={styles.td}>
                    <strong>₹{a.requestedAmount?.toFixed(2)}</strong>
                  </td>
                  <td style={{ ...styles.td, maxWidth: '200px' }}>{a.reason}</td>
                  <td style={styles.td}>
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.btnRow}>
                      <button
                        id={`approve-${a._id}`}
                        style={styles.approveBtn}
                        disabled={processing[a._id]}
                        onClick={() => act(a._id, 'approve')}
                      >
                        {processing[a._id] ? '…' : 'Approve'}
                      </button>
                      <button
                        id={`reject-${a._id}`}
                        style={styles.rejectBtn}
                        disabled={processing[a._id]}
                        onClick={() => act(a._id, 'reject')}
                      >
                        {processing[a._id] ? '…' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' },
  title: { fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: '#1e293b' },
  tableWrap: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { background: '#f8fafc', padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', verticalAlign: 'top', color: '#334155' },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  email: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  btnRow: { display: 'flex', gap: '8px' },
  approveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  rejectBtn: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  errorBanner: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  empty: { color: '#64748b', padding: '40px 0', textAlign: 'center' },
  center: { textAlign: 'center', padding: '60px', color: '#64748b' },
};

export default PendingApprovals;
