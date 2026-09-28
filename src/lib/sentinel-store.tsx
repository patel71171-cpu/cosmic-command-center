import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import { assessments, findings, trend as initialTrend, assets as initialAssets, evidence as initialEvidence, categories as initialCategories, severityData as initialSeverityData, type Assessment, type Finding } from './sentinel-data';

type Store = {
  findings: Finding[];
  assessments: Assessment[];
  trend: any[];
  assets: any[];
  evidence: any[];
  severityData: {name: string, value: number}[];
  categories: {name: string, count: number}[];
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  updateAssessment: (id: string, patch: Partial<Assessment>) => void;
  addAssessment: (a: Assessment) => void;
  removeAssessment: (id: string) => void;
  addFinding: (f: Finding) => void;
  notify: (message: string) => void;
  message: string;
  selectedAssessment: string;
  setSelectedAssessment: (id: string) => void;
  userName: string;
  setUserName: (name: string) => void;
};

const Context = createContext<Store | null>(null);

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [allFindings, setFindings] = useState(findings);
  const [allAssessments, setAssessments] = useState(assessments);
  const [allAssets, setAssets] = useState(initialAssets);
  const [allEvidence, setEvidence] = useState(initialEvidence);
  const [allTrend, setTrend] = useState(initialTrend);
  
  const [userName, setUserName] = useState('Pratham Patel');
  const [message, setMessage] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('world-monitor');

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setAssessments(prev => {
        let changed = false;
        const next = prev.map(a => {
          if (a.status === 'Running' && a.progress < 100) {
            changed = true;
            const newProgress = Math.min(100, a.progress + 12);
            
            const timeStr = new Date().toLocaleTimeString('en-GB');
            const messages = [
               "Scope validation passed",
               "132 endpoints indexed",
               "Static code blocks analyzed",
               "API boundaries mapped",
               "Dependencies verified",
               "Evidence chain captured",
               "Finding correlated",
               "Risk calculation completed",
               "Report generated"
            ];
            const msgIdx = Math.floor((newProgress / 100) * (messages.length - 1));
            const logMsg = `${timeStr} · ${messages[msgIdx]}`;
            // Avoid duplicate contiguous logs
            const logs = a.logs || [];
            const newLogs = logs.length > 0 && logs[0].includes(messages[msgIdx]) ? logs : [logMsg, ...logs];

            if (newProgress === 100) {
              const newFinding: Finding = {
                id: `FND-${Date.now()}`,
                title: `Discovered issue in ${a.target}`,
                severity: 'High',
                cvss: 7.5,
                confidence: 'High',
                category: 'Configuration',
                asset: a.target,
                status: 'Open',
                detected: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                summary: 'An automated check discovered a configuration vulnerability during the assessment pipeline.',
                impact: 'Could allow unintended access or data exposure.',
                fix: 'Review the configuration against baseline security standards.',
                owner: 'Unassigned',
                evidence: []
              };
              setFindings(f => [newFinding, ...f]);
              return { ...a, progress: 100, status: 'Completed', findings: a.findings + 1, score: 82, lastRun: new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' }), logs: newLogs };
            }
            return { ...a, progress: newProgress, logs: newLogs, lastRun: `Running (${newProgress}%)` };
          }
          return a;
        });
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const severityData = useMemo(() => {
    // Base data to match the "real details" of the 51 total findings in the mock design.
    // We subtract the 6 seeded findings (1C, 2H, 2M, 1L, 0I) from the base offsets.
    const counts = { Critical: 2, High: 10, Medium: 16, Low: 6, Informational: 11 };
    allFindings.forEach(f => {
      if (f.status !== 'Verified' && f.status !== 'Resolved') {
        counts[f.severity as keyof typeof counts] = (counts[f.severity as keyof typeof counts] || 0) + 1;
      }
    });
    
    return [
      { name: 'Critical', value: counts.Critical },
      { name: 'High', value: counts.High },
      { name: 'Medium', value: counts.Medium },
      { name: 'Low', value: counts.Low },
      { name: 'Informational', value: counts.Informational }
    ];
  }, [allFindings]);

  const categories = useMemo(() => {
    // Base data to match "real details". Subtract 1 from each since the 6 seeded findings cover 1 of each.
    const cats: Record<string, number> = {
      'Authorization': 13,
      'API Security': 10,
      'Dependencies': 8,
      'Authentication': 7,
      'Configuration': 5,
      'Client Security': 2
    };
    allFindings.forEach(f => {
      if (f.status !== 'Verified' && f.status !== 'Resolved') {
        cats[f.category] = (cats[f.category] || 0) + 1;
      }
    });
    return Object.entries(cats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allFindings]);

  return (
    <Context.Provider 
      value={{
        findings: allFindings,
        assessments: allAssessments,
        trend: allTrend,
        assets: allAssets,
        evidence: allEvidence,
        severityData,
        categories,
        updateFinding: (id, patch) => setFindings(items => items.map(f => f.id === id ? { ...f, ...patch } : f)),
        updateAssessment: (id, patch) => setAssessments(items => items.map(a => a.id === id ? { ...a, ...patch } : a)),
        addAssessment: a => setAssessments(items => [a, ...items]),
        removeAssessment: id => setAssessments(items => items.filter(a => a.id !== id)),
        addFinding: f => setFindings(items => [f, ...items]),
        notify,
        message,
        selectedAssessment,
        setSelectedAssessment,
        userName,
        setUserName
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
