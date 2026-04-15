"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, width = 480, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: `${width}px`,
          maxHeight: "90svh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          animation: "modalIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--muted-foreground)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = "אישור", danger = false, loading = false
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "13px",
              color: "var(--foreground-secondary)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: danger ? "var(--destructive)" : "var(--primary)",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontSize: "13px",
              color: danger ? "#fff" : "var(--primary-foreground)",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "מעבד..." : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: "var(--foreground-secondary)", fontSize: "14px", lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
