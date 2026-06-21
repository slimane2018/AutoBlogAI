import React, { useEffect, useState } from 'react';

export default function Home() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // placeholder - implement API later
    setStats({ totalArticles: 0, publishedToday: 0, pendingQueue: 0, wpSites: 0 });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AutoBlog AI</h1>

      <section className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded shadow">Total Articles<br/><strong>{stats?.totalArticles}</strong></div>
        <div className="p-4 bg-white rounded shadow">Published Today<br/><strong>{stats?.publishedToday}</strong></div>
        <div className="p-4 bg-white rounded shadow">Pending Queue<br/><strong>{stats?.pendingQueue}</strong></div>
        <div className="p-4 bg-white rounded shadow">WordPress Sites<br/><strong>{stats?.wpSites}</strong></div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Quick actions</h2>
        <div className="flex gap-3 mt-3">
          <a className="btn" href="/neuronwriter">Add NeuronWriter Account</a>
          <a className="btn" href="/keywords/new">Add Keyword</a>
        </div>
      </section>
    </div>
  );
}
