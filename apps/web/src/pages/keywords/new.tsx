import React, { useEffect, useState } from 'react';

export default function AddKeywordPage() {
  const [keyword, setKeyword] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [websiteId, setWebsiteId] = useState('');

  useEffect(() => {
    fetch('/api/neuronwriter/connect').then(r => r.json()).then(data => setAccounts(data || []));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword) return alert('keyword required');
    const res = await fetch('/api/keywords/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, neuronWriterAccountId: accountId, websiteId }),
    });
    if (res.ok) {
      alert('Keyword added and enqueued');
      setKeyword('');
    } else {
      const j = await res.json();
      alert('Error: ' + (j?.error || 'Unknown'));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add Keyword</h1>
      <form onSubmit={handleCreate} className="space-y-3">
        <label className="block">
          <div className="text-sm">Keyword</div>
          <input className="input" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm">NeuronWriter Account</div>
          <select className="input" value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">Select an account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="text-sm">Website ID (optional)</div>
          <input className="input" value={websiteId} onChange={e => setWebsiteId(e.target.value)} placeholder="paste website id or leave empty" />
        </label>
        <button className="btn" type="submit">Create & Enqueue</button>
      </form>
    </div>
  );
}
