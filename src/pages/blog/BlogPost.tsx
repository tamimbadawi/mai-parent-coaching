import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, Heart, Share2 } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { blogPosts } from '../data/content';

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const post = blogPosts.find((p) => p.id === id);
  const related = blogPosts.filter((p) => p.id !== id).slice(0, 3);

  if (!post) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-charcoal mb-2">Article Not Found</h1>
          <Link to="/blog" className="text-sage-dark hover:text-sage transition-colors">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24">
      {/* Header Image */}
      <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="py-12 bg-ivory">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-sage/10 text-sage-dark px-3 py-1 rounded-full text-xs font-medium">
                {post.category}
              </span>
              <span className="text-soft-gray text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> {post.readTime}
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-6">{post.title}</h1>
            <p className="text-warm-gray text-lg leading-relaxed mb-8 italic">{post.excerpt}</p>

            {/* Placeholder content */}
            <div className="prose prose-stone max-w-none">
              <p className="text-warm-gray leading-relaxed mb-4">
                {post.content || `This article explores ${post.title.toLowerCase()} in depth, drawing from the latest research in child psychology, neuroscience, and trauma-informed care. As parents, we often find ourselves navigating uncharted territory, unsure of which path to take or how to respond to our children's most challenging moments.`}
              </p>
              <p className="text-warm-gray leading-relaxed mb-4">
                The journey of parenting is not about perfection. It's about connection, repair, and showing up — even when we feel completely unequipped. Every difficult moment is an opportunity for growth, both for our children and for ourselves.
              </p>
              <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Understanding the Science</h2>
              <p className="text-warm-gray leading-relaxed mb-4">
                Research consistently shows that the quality of the parent-child relationship is the single most important factor in a child's emotional development. When we prioritize connection over correction, we build the neural pathways that support resilience, empathy, and self-regulation.
              </p>
              <p className="text-warm-gray leading-relaxed mb-4">
                This doesn't mean we never set boundaries or allow our children to experience discomfort. Rather, it means we hold those boundaries with warmth and empathy, recognizing that our children's big feelings are not something to be fixed, but something to be witnessed.
              </p>
              <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Practical Strategies</h2>
              <p className="text-warm-gray leading-relaxed mb-4">
                Here are some evidence-based strategies you can begin implementing today:
              </p>
              <ul className="list-disc list-inside space-y-2 text-warm-gray mb-6">
                <li>Practice co-regulation by calming your own nervous system first</li>
                <li>Use "time-in" instead of time-out to maintain connection during difficult moments</li>
                <li>Validate emotions before problem-solving</li>
                <li>Create predictable routines that support felt safety</li>
                <li>Model the emotional regulation you want to see</li>
              </ul>
              <p className="text-warm-gray leading-relaxed mb-4">
                Remember: small shifts, consistently applied, create lasting change. You don't need to overhaul your entire parenting approach overnight. Choose one strategy that resonates with you and practice it until it feels natural.
              </p>
              <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">When to Seek Support</h2>
              <p className="text-warm-gray leading-relaxed mb-4">
                If you find yourself feeling stuck, overwhelmed, or triggered more often than not, it may be time to seek additional support. There is no shame in asking for help — in fact, it's one of the most loving things you can do for your family.
              </p>
              <p className="text-warm-gray leading-relaxed mb-4">
                Whether through coaching, therapy, or community support, reaching out is a sign of strength and self-awareness. You deserve support, and your children benefit enormously when you prioritize your own wellbeing.
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-beige">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-cream text-warm-gray px-3 py-1 rounded-full text-xs flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-6">
              <button className="flex items-center gap-2 text-warm-gray hover:text-sage-dark transition-colors text-sm">
                <Heart className="w-4 h-4" /> Like
              </button>
              <button className="flex items-center gap-2 text-warm-gray hover:text-sage-dark transition-colors text-sm">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </AnimatedSection>
        </div>
      </article>

      {/* Related Posts */}
      <section className="py-16 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="font-serif text-2xl text-charcoal mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to={`/blog/${r.id}`} className="group block">
                  <div className="bg-ivory rounded-2xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-md transition-all duration-300">
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={r.image}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-base text-charcoal group-hover:text-sage-dark transition-colors line-clamp-2">
                        {r.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
