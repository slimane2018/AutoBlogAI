import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function ArticlePreview() {
  const router = useRouter();
  const { id } = router.query;
  const [article, setArticle] = useState<any>(null);
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [taxonomies, setTaxonomies] = useState<{ categories: any[]; tags: any[] }>({ categories: [], tags: [] });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/articles/${id}`).then(r => r.json()).then(setArticle);
    fetch('/api/websites/connect').then(r => r.json()).then(setWebsites);
  }, [id]);

  useEffect(() => {
    if (!selectedWebsite) return;
    fetch(`/api/websites/${selectedWebsite}/taxonomies`).then(r => r.json()).then(setTaxonomies);
  }, [selectedWebsite]);

  async function handlePublish() {
    if (!article) return;
    if (!selectedWebsite) return alert('Choose a website to publish to');
    setPublishing(true);
    const payload = {
      articleId: article.id,
      websiteId: selectedWebsite,
      publishAs: 'publish',
      categories: selectedCategoryIds,
      tags: selectedTagIds,
      featuredImageIndex,
    };
    const res = await fetch('/api/articles/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setPublishing(false);
    if (res.ok) {
      alert('Publish job enqueued');
      router.push('/');
    } else {
      const j = await res.json();
      alert('Error: ' + (j?.error || 'Unknown'));
    }
  }

  if (!article) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Preview: {article.title}</h1>
      <div className="flex gap-6">
        <div className="flex-1 bg-white p-4 rounded shadow" dangerouslySetInnerHTML={{ __html: article.content }} />
        <aside className="w-80">
          <div className="p-4 bg-white rounded shadow mb-4">
            <h3 className="font-semibold">Publish options</h3>
            <label className="block mt-3">
              <div className="text-sm">Website</div>
              <select className="input" value={selectedWebsite} onChange={e => setSelectedWebsite(e.target.value)}>
                <option value="">Select site</option>
                {websites.map(w => <option key={w.id} value={w.id}>{w.siteUrl}</option>)}
              </select>
            </label>

            <label className="block mt-3">
              <div className="text-sm">Categories</div>
              <select multiple className="input" value={selectedCategoryIds.map(String)} onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                setSelectedCategoryIds(opts);
              }}>
                {taxonomies.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block mt-3">
              <div className="text-sm">Tags</div>
              <select multiple className="input" value={selectedTagIds.map(String)} onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                setSelectedTagIds(opts);
              }}>
                {taxonomies.tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>

            <div className="mt-3">
              <div className="text-sm font-medium">Featured image</div>
              <div className="space-y-2 mt-2">
                {article.images && article.images.length ? article.images.map((img: any, idx: number) => (
                  <label key={img.id} className="flex items-center gap-2 p-2 border rounded">
                    <input type="radio" name="featured" checked={featuredImageIndex === idx} onChange={() => setFeaturedImageIndex(idx)} />
                    <img src={img.url} alt={img.alt || ''} style={{ width: 80, height: 60, objectFit: 'cover' }} />
                    <div className="text-sm">{img.provider}</div>
                  </label>
                )) : <div className="text-sm text-gray-600">No images found</div>}
              </div>
            </div>

            <button className="btn mt-4 w-full" onClick={handlePublish} disabled={publishing}>{publishing ? 'Enqueuing...' : 'Publish'}</button>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <h4 className="font-semibold">Meta</h4>
            <div className="text-sm mt-2">Keyword: {article.keyword?.keyword}</div>
            <div className="text-sm mt-1">Word Count: {article.wordCount}</div>
            <div className="text-sm mt-1">Readability: {article.readability}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
