import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

interface Rule {
  id: string;
  level: number;
  percentage: string;
  effectiveFrom: string;
}

export const AdminCommissionRulesPage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [newRate, setNewRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiClient.get<Rule[]>('/commission/rules').then((res) => {
      setRules(res.data.sort((a, b) => a.level - b.level));
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSave = async (level: number) => {
    setError(null);
    try {
      await apiClient.post('/commission/rules', { level, percentage: Number(newRate) });
      setEditingLevel(null);
      setNewRate('');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message?.join?.(', ') || err?.response?.data?.message || 'Could not update rate.');
    }
  };

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[19px] font-bold">Commission Rules</h1>
        <p className="text-[12.5px] text-ink-soft">
          Level 1 is the paying member — never configurable, never shown as a row. Changing a rate versions a
          new row; historical ledger entries keep the rate that was active when they were credited.
        </p>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-state-crimson-soft text-state-crimson text-xs">{error}</div>}

      <div className="card p-0 py-5.5 max-w-2xl">
        <table className="data-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Current Rate</th>
              <th>Effective From</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="font-bold">Level {r.level}</td>
                <td>
                  {editingLevel === r.level ? (
                    <input
                      autoFocus
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="input py-1.5 text-xs w-20 font-mono"
                      placeholder={r.percentage}
                    />
                  ) : (
                    <span className="badge-gold">{Number(r.percentage)}%</span>
                  )}
                </td>
                <td className="font-mono text-ink-soft text-xs">{new Date(r.effectiveFrom).toLocaleDateString('en-IN')}</td>
                <td>
                  {editingLevel === r.level ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(r.level)} className="text-xs font-bold text-state-green">
                        Save
                      </button>
                      <button onClick={() => setEditingLevel(null)} className="text-xs text-ink-faint">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingLevel(r.level);
                        setNewRate(r.percentage);
                      }}
                      className="text-xs font-bold text-brand-red"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
