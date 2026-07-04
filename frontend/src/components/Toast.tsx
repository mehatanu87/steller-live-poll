import { CheckCircle, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import { Toast as ToastType } from '../hooks/useVault';
import { explorerTxLink } from '../lib/stellar';

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />,
    error:   <AlertCircle size={16} style={{ color: 'var(--rose)', flexShrink: 0 }} />,
    info:    <span className="spinner" style={{ width: 15, height: 15, borderTopColor: 'var(--cyan)', flexShrink: 0 }} />,
  };

  return (
    <div className={`toast toast-${toast.type}`} style={{ animation: 'slideUp 0.25s ease' }}>
      {icons[toast.type]}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: 'var(--text-primary)' }}>{toast.message}</p>
        {toast.txHash && (
          <a
            href={explorerTxLink(toast.txHash)}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--cyan)', marginTop: 3, textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
          >
            {toast.txHash.slice(0, 8)}…{toast.txHash.slice(-4)}
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: 2 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
