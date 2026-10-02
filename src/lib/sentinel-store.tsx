import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { assessments as seedAssessments, findings as seedFindings, type Assessment, type Finding } from './sentinel-data';
import { api } from './sentinel-api';

type Store = {
  findings: Finding[];
  assessments: Assessment[];
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  addAssessment: (a: Assessment) => void;
  notify: (message: string) => void;
  message: string;
  selectedAssessment: string;
  setSelectedAssessment: (id: string) => void;
  loading: boolean;
  backendConnected: boolean;
  refreshData: () => Promise<void>;
  runScan: (
    target: string,
    name: string,
    options?: {
      authorized?: boolean;
      description?: string | undefined;
      environment?: string;
      scope?: string;
      checks?: string[];
    },
  ) => Promise<string | null>;
};

const Context = createContext<Store | null>(null);

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [allFindings, setFindings] = useState<Finding[]>(seedFindings);
  const [allAssessments, setAssessments] = useState<Assessment[]>(seedAssessments);
  const [message, setMessage] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [assessmentsData, findingsData] = await Promise.all([
        api.listAssessments(),
        api.listFindings(),
      ]);
      // Replace unconditionally: when authenticated, the backend is the
      // source of truth. Never keep stale rows once a live result arrives.
      setAssessments(assessmentsData);
      setFindings(findingsData);
      // Keep the header selector pointing at a real record once data loads.
      setSelectedAssessment(prev =>
        assessmentsData.some(a => a.id === prev)
          ? prev
          : (assessmentsData[0]?.id ?? prev),
      );
      setBackendConnected(true);
    } catch (err) {
      // Backend unavailable or unauthenticated — keep the current rows and
      // surface the reason instead of failing silently.
      if (import.meta.env.DEV) {
        console.warn('[SENTINEL] refreshData failed:', err);
      }
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateFinding = (id: string, patch: Partial<Finding>) => {
    const previous = allFindings.find(f => f.id === id);
    setFindings(items => items.map(f => (f.id === id ? { ...f, ...patch } : f)));
    // Sync to backend; if the write is rejected (offline, expired token,
    // RBAC) roll the optimistic edit back so the UI never drifts from the DB.
    api.updateFinding(id, patch).catch((err: any) => {
      if (previous) {
        const snapshot = previous;
        setFindings(items => items.map(f => (f.id === id ? snapshot : f)));
      }
      notify(`Could not save that change: ${err?.message || 'request failed'}`);
    });
  };

  const addAssessment = (a: Assessment) => {
    setAssessments(items => [a, ...items]);
  };

  const runScan = async (
    target: string,
    name: string,
    options?: {
      authorized?: boolean;
      description?: string | undefined;
      environment?: string;
      scope?: string;
      checks?: string[];
    },
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const result = await api.createAssessment({
        name,
        target,
        environment: options?.environment || 'Staging',
        scope: options?.scope || 'Web Application',
        checks: options?.checks || [
          'Authentication',
          'Authorization',
          'API Security',
          'Dependencies',
        ],
        description: options?.description,
        authorized: options?.authorized ?? true,
      });
      setAssessments(prev => [result, ...prev]);
      // Refresh findings from backend
      const findingsData = await api.listFindings();
      setFindings(findingsData);
      setBackendConnected(true);
      notify(`Assessment started: scanning ${target}`);
      return result.id;
    } catch (err: any) {
      notify(`Scan failed: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Context.Provider
      value={{
        findings: allFindings,
        assessments: allAssessments,
        updateFinding,
        addAssessment,
        notify,
        message,
        selectedAssessment,
        setSelectedAssessment,
        loading,
        backendConnected,
        refreshData,
        runScan,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useSentinel() {
  const value = useContext(Context);
  if (!value) throw new Error('SENTINEL context missing');
  return value;
}
