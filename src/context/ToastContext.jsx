import { createContext, useContext, useState, useCallback } from "react";
import { colors, fonts, shadows } from "../styles/theme.js";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: t.type === "error" ? colors.danger : t.type === "warning" ? colors.warningText : colors.green,
            color: colors.white, boxShadow: shadows.elevated,
            animation: "fadeIn .2s ease",
            fontFamily: fonts.sans,
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used within ToastProvider");
  return toast;
}
