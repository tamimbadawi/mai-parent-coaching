import { useState } from 'react';
import { Download, FileText, ListChecks, BookOpen, ClipboardList, X, Mail, ArrowRight } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { freeResources } from '../data/content';
import type { FreeResource } from '../types';

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  checklist: ListChecks,
  worksheet: ClipboardList,
  guide: BookOpen,
};

const typeLabels: Record<string, string> = {
  pdf: 'PDF',
  checklist: 'Checklist',
  worksheet: 'Worksheet',
  guide: 'Guide',
};

export default function Resources() {
  const [selectedResource, setSelectedResource] = useState<FreeResource | null>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Free Resources</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Tools for Your Journey
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Downloadable guides, checklists, and worksheets to support you and your family. All resources are free — just share your email so I can send you occasional helpful updates.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {freeResources.map((resource, i) => {
              const Icon = typeIcons[resource.type] || FileText;
              return (
                <AnimatedSection key={resource.id} delay={i * 0.08}>
                  <button
                    onClick={() => {
                      setSelectedResource(resource);
                      setSubmitted(false);
                      setEmail('');
                    }}
                    className="w-full text-left bg-cream rounded-2xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500 group"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 bg-ivory/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-charcoal flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {typeLabels[resource.type]}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-lg text-charcoal mb-2 group-hover:text-sage-dark transition-colors">
                        {resource.title}
                      </h3>
                      <p className="text-warm-gray text-sm leading-relaxed">{resource.description}</p>
                      <div className="mt-4 flex items-center gap-2 text-sage-dark text-sm font-medium">
                        <Download className="w-4 h-4" />
                        Free Download
                      </div>
                    </div>
                  </button>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
          <div className="bg-ivory rounded-3xl max-w-md w-full p-8 relative shadow-2xl">
            <button
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-beige/50 flex items-center justify-center text-warm-gray hover:bg-beige transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-sage" />
                </div>
                <h3 className="font-serif text-2xl text-charcoal mb-2">Thank You!</h3>
                <p className="text-warm-gray mb-6">
                  Your download link has been sent to {email}. Check your inbox (and spam folder just in case).
                </p>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="bg-sage text-white px-6 py-3 rounded-full font-medium hover:bg-sage-dark transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
                    {(() => {
                      const Icon = typeIcons[selectedResource.type] || FileText;
                      return <Icon className="w-6 h-6 text-sage-dark" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-charcoal">{selectedResource.title}</h3>
                    <p className="text-sm text-soft-gray">{typeLabels[selectedResource.type]}</p>
                  </div>
                </div>
                <p className="text-warm-gray mb-6">{selectedResource.description}</p>
                <form onSubmit={handleDownload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soft-gray" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-cream border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-sage text-white px-6 py-3 rounded-full font-medium hover:bg-sage-dark transition-all inline-flex items-center justify-center gap-2"
                  >
                    Get Free Download <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-soft-gray text-center">
                    By downloading, you agree to receive occasional helpful emails. Unsubscribe anytime.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
