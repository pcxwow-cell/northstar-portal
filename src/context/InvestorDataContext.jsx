import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchInvestorProjects,
  fetchDocuments,
  fetchDistributions,
  fetchMessages,
  fetchProjects,
} from "../api.js";

const InvestorDataContext = createContext(null);

export function InvestorDataProvider({ user, children }) {
  const [investor, setInvestor] = useState(user || null);
  const [myProjects, setMyProjects] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [allDistributions, setAllDistributions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!investor) return;
    try {
      const [projects, docs, dists, msgs] = await Promise.all([
        fetchInvestorProjects(investor.id),
        fetchDocuments(investor.id),
        fetchDistributions(investor.id),
        fetchMessages(),
      ]);
      setMyProjects(Array.isArray(projects) ? projects : []);
      setAllDocuments(Array.isArray(docs) ? docs : []);
      setAllDistributions(Array.isArray(dists) ? dists : []);
      setMessages(Array.isArray(msgs) ? msgs.map(m => ({ ...m })) : []);
    } catch (err) {
      console.error("InvestorDataContext reload failed:", err);
    }
  }, [investor]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setInvestor(user);
  }, [user]);

  useEffect(() => {
    if (!investor) return;
    setLoading(true);
    Promise.all([
      fetchInvestorProjects(investor.id),
      fetchDocuments(investor.id),
      fetchDistributions(investor.id),
      fetchMessages(),
      fetchProjects(),
    ])
      .then(([projects, docs, dists, msgs, allProjects]) => {
        setMyProjects(Array.isArray(projects) ? projects : []);
        setAllDocuments(Array.isArray(docs) ? docs : []);
        setAllDistributions(Array.isArray(dists) ? dists : []);
        setMessages(Array.isArray(msgs) ? msgs.map(m => ({ ...m })) : []);
        // allProjects available for consumers that need the full list
        // stored separately but exposed if needed via reload
        void allProjects;
      })
      .catch(err => {
        console.error("InvestorDataContext initial load failed:", err);
      })
      .finally(() => setLoading(false));
  }, [investor]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InvestorDataContext.Provider
      value={{ investor, myProjects, allDocuments, allDistributions, messages, loading, reload }}
    >
      {children}
    </InvestorDataContext.Provider>
  );
}

export function useInvestorData() {
  const ctx = useContext(InvestorDataContext);
  if (!ctx) throw new Error("useInvestorData must be used within InvestorDataProvider");
  return ctx;
}
