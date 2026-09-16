import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, ArrowRight, Tag } from 'lucide-react';
import AnimatedSection from '../../components/ui/AnimatedSection';
import { blogPosts } from '../../data/content';

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(blogPosts.map((p) => p.category))];

  const filtered = blogPosts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featured = blogPosts[0];

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">Blog</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Insights & Inspiration
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Weekly articles on parenting, psychology, nervous system health, and personal growth. Written with compassion and backed by science.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-12 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <Link to={`/blog/${featured.id}`} className="group block">
              <div className="bg-ivory rounded-3xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500">
                <div className="grid lg:grid-cols-2">
                  <div className="relative h-64 lg:h-auto overflow-hidden">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-terracotta/10 text-terracotta-dark px-3 py-1 rounded-full text-xs font-medium">
                        {featured.category}
                      </span>
                      <span className="text-soft-gray text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {featured.readTime}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl text-charcoal mb-4 group-hover:text-sage-dark transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-warm-gray leading-relaxed mb-6">{featured.excerpt}</p>
                    <div className="flex items-center gap-2 text-sage-dark font-medium">
                      Read article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 bg-ivory border-b border-beige">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soft-gray" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-cream border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory === cat
                      ? 'bg-terracotta text-white'
                      : 'bg-cream text-warm-gray hover:bg-beige'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.slice(1).map((post, i) => (
              <AnimatedSection key={post.id} delay={i * 0.08}>
                <Link to={`/blog/${post.id}`} className="group block">
                  <div className="bg-cream rounded-2xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 bg-ivory/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-charcoal">
                        {post.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-lg text-charcoal mb-2 group-hover:text-sage-dark transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-warm-gray text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-soft-gray">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                          <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sage-dark text-sm">
                          <Tag className="w-3 h-3" />
                          <span className="text-xs">{post.tags[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-warm-gray text-lg">No articles found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
