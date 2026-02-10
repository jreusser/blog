export type PostSummary = {
  id: string;
  title: string;
  date_path: string;
};

export type PostIndexResponse = {
  posts: PostSummary[];
};

export type PostDetail = {
  id: string;
  title: string;
  date_path: string;
  markdown: string;
};

export async function fetchPosts(): Promise<PostIndexResponse> {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

export async function fetchPost(id: string): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${encodeURIComponent(id).replaceAll('%2F', '/')}`);
  if (!res.ok) throw new Error('Failed to load post');
  return res.json();
}
