import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const STATUS_STYLES = {
  SUCCESS:          { bg: '#dcfce7', text: '#166534' },
  APPROVED:         { bg: '#dcfce7', text: '#166534' },
  PENDING_APPROVAL: { bg: '#fef9c3', text: '#854d0e' },
  FAILED:           { bg: '#fee2e2', text: '#991b1b' },
  REJECTED:         { bg: '#fee2e2', text: '#991b1b' },
};

const ACTION_LABELS = {
  getOrderStatus:          'Get Order Status',
  checkReturnEligibility:  'Check Return Eligibility',
  initiateRefund:          'Initiate Refund',
  getDeliveryEstimate:     'Get Delivery Estimate',
  refundApproved:          '✅ Refund Approved',
  refundRejected:          '❌ Refund Rejected',
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-log');
      setLogs(res.data.data);
    } catch {
      setError('Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div style={styles.center}>Loading…</div>;

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Agent Audit Log</h1>
        <button style={styles.refreshBtn} onClick={load}>
          ↻ Refresh
        </button>
      </div>

      <p style={styles.subtitle}>
        Every agent tool call and admin approval/rejection event — read-only.
      </p>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {logs.length === 0 ? (
        <div style={styles.empty}>No agent activity recorded yet.</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Timestamp', 'User', 'Action', 'Order ID', 'Status', 'Approved By'].map(
                  (h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const s = STATUS_STYLES[log.status] || { bg: '#f1f5f9', text: '#334155' };
                return (
                  <tr key={log._id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.ts}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div>{log.userId?.name || '—'}</div>
                      <div style={styles.email}>{log.userId?.email || ''}</div>
                    </td>
                    <td style={styles.td}>
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td style={styles.td}>
                      {log.orderId ? (
                        <code style={styles.code}>{log.orderId}</code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          background: s.bg,
                          color: s.text,
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {log.approvedBy?.name || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1300px', margin: '0 auto' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '13px', marginBottom: '20px' },
  refreshBtn: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', color: '#334155' },
  tableWrap: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { background: '#f8fafc', padding: '11px 14px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '11px 14px', verticalAlign: 'top', color: '#334155' },
  ts: { fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: '#64748b' },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' },
  email: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  errorBanner: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  empty: { color: '#64748b', padding: '40px 0', textAlign: 'center' },
  center: { textAlign: 'center', padding: '60px', color: '#64748b' },
};

export default AuditLog;
