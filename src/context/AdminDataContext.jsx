import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchAdminProjects, fetchAdminInvestors } from "../api.js";

const AdminDataContext = createContext(null);

export function AdminDataProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadProjects = useCallback(() => {
    return fetchAdminProjects().then(data => {
      setProjects(Array.isArray(data) ? data : data.projects || []);
    });
  }, []);

  const reloadInvestors = useCallback(() => {
    return fetchAdminInvestors().then(data => {
      setInvestors(Array.isArray(data) ? data : data.investors || []);
    });
  }, []);

  useEffect(() => {
    Promise.all([reloadProjects(), reloadInvestors()]).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AdminDataContext.Provider value={{ projects, reloadProjects, investors, reloadInvestors, loading }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}
