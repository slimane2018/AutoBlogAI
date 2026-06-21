import React, { useEffect, useState } from 'react';

export default function WebsitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');

  useEffect(() => {
    fetch('/api/websites/connect').then(r => r.json()).then(data => setSites(data || []));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/websites/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl, username, applicationPassword: appPassword, name: username }),
    });
    if (res.ok) {
      setSiteUrl('');
      setUsername('');
      setAppPassword('');
      setSites(await (await fetch('/api/websites/connect')).json());
    } else {
      const j = await res.json();
      alert('Error: ' + (j?.error || 'Unknown'));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WordPress Sites</h1>
      <form onSubmit={handleAdd} className="space-y-3">
        <label className="block">
          <div className="text-sm">Site URL</div>
          <input className="input" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://example.com" />
        </label>
        <label className="block">
          <div className="text-sm">Username (WP username)</div>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm">Application Password</div>
          <input className="input" value={appPassword} onChange={e => setAppPassword(e.target.value)} type="password" />
        </label>
        <button className="btn" type="submit">Connect & Verify</button>
      </form>

      <section className="mt-6">
        <h2 className="text-lg font-medium">Connected Sites</h2>
        <ul className="mt-2">
          {sites.map(site => (
            <li key={site.id} className="p-3 bg-white rounded shadow mb-2">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{site.siteUrl}</div>
                  <div className="text-sm text-gray-600">{site.username}</div>
                </div>
                <div className="text-sm">
                  {site.verified ? <span className="text-green-600">Verified</span> : <span className="text-orange-600">Not verified</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
