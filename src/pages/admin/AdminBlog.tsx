import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, X, Check } from 'lucide-react';
import { blogPosts as staticBlogPosts } from '../../data/content';
import AdminLayout from './AdminLayout';
import type { BlogPost } from '../../types';

// Blog management uses the static content.ts list as the source of truth.
// To connect to a live database, replace state with Supabase queries on a blog_posts table.

const emptyPost = (): Omit<BlogPost, 'id'> => ({
  title: '',
  excerpt: '',
  content: '',
  category: '',
  author: '',
  date: new Date().toISOString().split('T')[0],
  image: '',
  readTime: '',
  tags: [],
});

const AdminBlog = (): JSX.Element => {
  const [posts, setPosts] = useState<BlogPost[]>(staticBlogPosts);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<BlogPost, 'id'>>(emptyPost());

  const startEdit = (post: BlogPost): void => {
    setEditing(post);
    setDraft({ ...post });
    setCreating(false);
  };

  const startCreate = (): void => {
    setCreating(true);
    setEditing(null);
    setDraft(emptyPost());
  };

  const cancel = (): void => {
    setEditing(null);
    setCreating(false);
  };

  const saveEdit = (): void => {
    if (!editing) return;
    setPosts((prev) => prev.map((p) => (p.id === editing.id ? { ...editing, ...draft } : p)));
    setEditing(null);
  };

  const saveCreate = (): void => {
    const newPost: BlogPost = {
      ...draft,
      id: String(Date.now()),
    };
    setPosts((prev) => [newPost, ...prev]);
    setCreating(false);
  };

  const deletePost = (id: string): void => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const isFormOpen = editing !== null || creating;

  return (
    <AdminLayout title="Blog Posts">
      <div className="space-y-6">
        {/* Note banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Changes here are in-memory only. To persist blog posts, connect a{' '}
          <code className="font-mono">blog_posts</code> table in Supabase.
        </div>

        {/* Toolbar */}
        <div className="flex justify-end">
          <button
            onClick={startCreate}
            disabled={isFormOpen}
            className="flex items-center gap-2 rounded-2xl bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark transition-colors disabled:opacity-50"
          >
            <PlusCircle className="h-4 w-4" />
            New Post
          </button>
        </div>

        {/* Create / Edit form */}
        {isFormOpen && (
          <div className="rounded-[24px] border border-beige bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-serif text-lg text-charcoal">
              {creating ? 'New Post' : 'Edit Post'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-warm-gray">Title</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-warm-gray">Category</label>
                <input
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-warm-gray">Author</label>
                <input
                  value={draft.author}
                  onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-warm-gray">Date</label>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-warm-gray">Read Time</label>
                <input
                  value={draft.readTime}
                  onChange={(e) => setDraft((d) => ({ ...d, readTime: e.target.value }))}
                  placeholder="e.g. 5 min"
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-warm-gray">Image URL</label>
                <input
                  value={draft.image}
                  onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-warm-gray">Excerpt</label>
                <textarea
                  rows={3}
                  value={draft.excerpt}
                  onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-warm-gray">
                  Content (Markdown)
                </label>
                <textarea
                  rows={6}
                  value={draft.content}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage resize-none font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancel}
                className="flex items-center gap-1 rounded-xl border border-beige px-4 py-2 text-sm text-warm-gray hover:bg-cream transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={creating ? saveCreate : saveEdit}
                disabled={!draft.title.trim()}
                className="flex items-center gap-1 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        )}

        {/* Posts list */}
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 rounded-[20px] border border-beige bg-white p-4 shadow-sm"
            >
              {post.image && (
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-16 w-24 shrink-0 rounded-2xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{post.title}</p>
                <p className="text-xs text-warm-gray">
                  {post.category} · {post.date} · {post.readTime}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => startEdit(post)}
                  disabled={isFormOpen}
                  className="rounded-xl border border-beige p-2 text-warm-gray hover:border-sage hover:text-sage-dark transition-colors disabled:opacity-40"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={isFormOpen}
                  className="rounded-xl border border-beige p-2 text-warm-gray hover:border-rose-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
