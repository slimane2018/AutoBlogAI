import React, { useEffect, useState } from 'react';

export default function NeuronWriterPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('My Neuron');

  useEffect(() => {
    fetch('/api/neuronwriter/connect').then(r => r.json()).then(data => setAccounts(data || []));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/neuronwriter/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, name }) });
    if (res.ok) {
      setApiKey('');
      setName('My Neuron');
      const list = await (await fetch('/api/neuronwriter/connect')).json();
      setAccounts(list);
    } else {
      const j = await res.json();
      alert('Error: ' + (j?.error || 'Unknown'));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">NeuronWriter Accounts</h1>
      <form onSubmit={handleAdd} className="space-y-3">
        <label className="block">
          <div className="text-sm">API Key</div>
          <input className="input" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm">Name</div>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <button className="btn" type="submit">Save</button>
      </form>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Your Accounts</h2>
        <ul className="mt-2">
          {accounts.map(acc => (
            <li key={acc.id} className="p-3 bg-white rounded shadow mb-2">{acc.name} — {new Date(acc.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
