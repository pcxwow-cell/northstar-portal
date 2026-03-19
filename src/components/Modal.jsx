import { useEffect, useRef } from "react";
import { shadows, radius, colors, fonts } from "../styles/theme.js";

export default function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const focusable = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const trap = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        background: colors.white, borderRadius: radius.lg, padding: "28px 32px",
        maxWidth: `min(90vw, ${maxWidth}px)`, width: "100%", maxHeight: "85vh", overflowY: "auto",
        boxShadow: shadows.modal,
      }}>
        {title && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, fontFamily: fonts.sans }}>{title}</h3>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.mutedText, padding: 4 }}>&times;</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
