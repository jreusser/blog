import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchPost, fetchPosts, PostDetail, PostSummary, TagSummary } from './api';

type Route =
  | { kind: 'home' }
  | { kind: 'post'; postId: string }
  | { kind: 'tag'; tag: string };

function useHashRoute(): [Route, (route: Route) => void] {
  const get = () => {
    const h = window.location.hash;
    if (!h || h === '#') return { kind: 'home' } as const;
    if (h.startsWith('#/post/')) return { kind: 'post', postId: decodeURIComponent(h.slice('#/post/'.length)) } as const;
    if (h.startsWith('#/tag/')) return { kind: 'tag', tag: decodeURIComponent(h.slice('#/tag/'.length)) } as const;
    return { kind: 'home' } as const;
  };

  const [route, setRoute] = useState<Route>(get());

  useEffect(() => {
    const onHashChange = () => setRoute(get());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: Route) => {
    if (next.kind === 'home') window.location.hash = '#/';
    if (next.kind === 'post') window.location.hash = `#/post/${encodeURIComponent(next.postId)}`;
    if (next.kind === 'tag') window.location.hash = `#/tag/${encodeURIComponent(next.tag)}`;
  };

  return [route, navigate];
}

function imageSrcForPost(postId: string, src?: string): string | undefined {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/content/')) return src;
  if (src.startsWith('/')) return `/content/${postId}${src}`;
  return `/content/${postId}/${src}`;
}

export function App() {
  const [route, navigate] = useHashRoute();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
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
        setTags(data.tags || []);
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
    if (route.kind !== 'post') {
      setSelected(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchPost(route.postId)
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
  }, [route]);

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
        {route.kind !== 'home' ? <button onClick={() => navigate({ kind: 'home' })}>Back</button> : null}
      </div>

      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {loading ? <p className="small">Loading…</p> : null}

      {route.kind !== 'post' ? (
        <div className="list">
          {tags.length ? (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Hashtags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => navigate({ kind: 'tag', tag: t.tag })}
                    disabled={route.kind === 'tag' && route.tag === t.tag}
                    title={`Show posts tagged #${t.tag}`}
                  >
                    #{t.tag} ({t.count})
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {route.kind === 'tag' ? (
            <div className="card">
              <div className="small">Showing posts tagged</div>
              <div style={{ fontWeight: 700 }}>#{route.tag}</div>
            </div>
          ) : null}

          {posts.map((p) => (
            route.kind === 'tag' && !p.tags.includes(route.tag) ? null :
            <div className="card" key={p.id}>
              <div className="titleRow">
                <div>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div className="small">{p.date_path}</div>
                </div>
                <button onClick={() => navigate({ kind: 'post', postId: p.id })}>Open</button>
              </div>
            </div>
          ))}
          {posts.filter((p) => (route.kind === 'tag' ? p.tags.includes(route.tag) : true)).length === 0 && !loading ? (
            <p className="small">No posts found.</p>
          ) : null}
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
