import { useState } from 'react';
import { PlusCircle, Pencil, Trash2, X, Check, FileText, CalendarRange, PenSquare } from 'lucide-react';
import { blogPosts as staticBlogPosts } from '../../data/content';
import AdminLayout from './AdminLayout';
import type { BlogPost } from '../../types';
import { Panel, StatCard } from './admin-ui';

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
  const latestPostDate = posts[0]?.date ?? 'No posts';

  return (
    <AdminLayout title="Blog Posts">
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Changes here are in-memory only. To persist blog posts, connect a{' '}
          <code className="font-mono">blog_posts</code> table in Supabase.
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={FileText} label="Published posts" value={posts.length} detail="Pieces available across the current editorial library." tone="sage" />
          <StatCard icon={CalendarRange} label="Latest publish date" value={latestPostDate} detail="Most recent content currently represented in the admin editor." tone="amber" />
          <StatCard icon={PenSquare} label="Editorial mode" value={isFormOpen ? 'Editing' : 'Ready'} detail="Use this surface to plan drafts, adjust metadata, and refine copy." tone="sky" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel
            title={creating ? 'Compose new post' : editing ? 'Refine selected post' : 'Editorial composer'}
            eyebrow="Writing desk"
            action={
              <button
                onClick={startCreate}
                disabled={isFormOpen}
                className="flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sage-dark disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                New Post
              </button>
            }
          >
            {isFormOpen ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Title</label>
                    <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Category</label>
                    <input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Author</label>
                    <input value={draft.author} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Date</label>
                    <input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Read time</label>
                    <input value={draft.readTime} onChange={(e) => setDraft((d) => ({ ...d, readTime: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Image URL</label>
                    <input value={draft.image} onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Excerpt</label>
                    <textarea rows={3} value={draft.excerpt} onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage resize-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-warm-gray">Content (Markdown)</label>
                    <textarea rows={8} value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} className="w-full rounded-2xl border border-beige bg-cream px-4 py-3 font-mono text-sm text-charcoal focus:outline-none focus:ring-1 focus:ring-sage resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={cancel} className="flex items-center gap-1 rounded-2xl border border-beige px-4 py-3 text-sm text-warm-gray transition-colors hover:bg-cream"><X className="h-4 w-4" /> Cancel</button>
                  <button onClick={creating ? saveCreate : saveEdit} disabled={!draft.title.trim()} className="flex items-center gap-1 rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sage-dark disabled:opacity-50"><Check className="h-4 w-4" /> Save</button>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-beige bg-cream px-6 py-10 text-center">
                <p className="font-serif text-2xl text-charcoal">Select a post or start a new one</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-warm-gray">This editorial workspace is designed for planning, editing, and organizing content even before you connect a live blog database.</p>
              </div>
            )}
          </Panel>

          <Panel title="Editorial library" eyebrow="Published content">
            <div className="space-y-3">
              {posts.map((post) => (
                <article key={post.id} className="flex items-center gap-4 rounded-[24px] border border-beige bg-cream p-4">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="h-20 w-28 shrink-0 rounded-2xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">{post.category}</span>
                      <span className="text-xs text-warm-gray">{post.date}</span>
                    </div>
                    <p className="mt-2 truncate text-base font-medium text-charcoal">{post.title}</p>
                    <p className="mt-1 text-sm text-warm-gray">{post.readTime}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(post)} disabled={isFormOpen} className="rounded-2xl border border-beige bg-white p-3 text-warm-gray transition-colors hover:border-sage hover:text-sage-dark disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deletePost(post.id)} disabled={isFormOpen} className="rounded-2xl border border-beige bg-white p-3 text-warm-gray transition-colors hover:border-rose-300 hover:text-rose-500 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBlog;
