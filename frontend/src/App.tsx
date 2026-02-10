import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchPost, fetchPosts, PostDetail, PostSummary } from './api';

function useHashRoute(): [string | null, (id: string | null) => void] {
  const get = () => {
    const h = window.location.hash;
    if (!h || h === '#') return null;
    if (h.startsWith('#/post/')) return decodeURIComponent(h.slice('#/post/'.length));
    return null;
  };

  const [postId, setPostId] = useState<string | null>(get());

  useEffect(() => {
    const onHashChange = () => setPostId(get());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (id: string | null) => {
    if (!id) window.location.hash = '#/';
    else window.location.hash = `#/post/${encodeURIComponent(id)}`;
  };

  return [postId, navigate];
}

function imageSrcForPost(postId: string, src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/content/')) return src;
  if (src.startsWith('/')) return `/content/${postId}${src}`;
  return `/content/${postId}/${src}`;
}

export function App() {
  const [postId, navigate] = useHashRoute();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [selected, setSelected] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPosts()
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!postId) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchPost(postId)
      .then((p) => {
        if (cancelled) return;
        setSelected(p);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const markdownComponents = useMemo(() => {
    if (!selected) return undefined;
    return {
      img: (props: any) => {
        const src = imageSrcForPost(selected.id, props.src);
        return <img {...props} src={src} style={{ maxWidth: '100%' }} />;
      },
    };
  }, [selected]);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Blog</h1>
        {postId ? <button onClick={() => navigate(null)}>Back</button> : null}
      </div>

      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {loading ? <p className="small">Loading…</p> : null}

      {!postId ? (
        <div className="list">
          {posts.map((p) => (
            <div className="card" key={p.id}>
              <div className="titleRow">
                <div>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div className="small">{p.date_path}</div>
                </div>
                <button onClick={() => navigate(p.id)}>Open</button>
              </div>
            </div>
          ))}
          {posts.length === 0 && !loading ? <p className="small">No posts found.</p> : null}
        </div>
      ) : selected ? (
        <div className="card">
          <div className="small">{selected.date_path}</div>
          <h2 style={{ marginTop: 8 }}>{selected.title}</h2>
          <ReactMarkdown components={markdownComponents as any}>{selected.markdown}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
