import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, BookOpen, Palette, PenTool, Headphones, Package, ArrowRight, Check } from 'lucide-react';
import AnimatedSection from '../components/ui/AnimatedSection';
import { shopProducts } from '../data/content';
// Shop page

const typeIcons: Record<string, React.ElementType> = {
  planner: PenTool,
  cards: Palette,
  journal: BookOpen,
  workbook: Package,
  ebook: BookOpen,
  toolkit: Package,
  audio: Headphones,
};

export default function Shop() {
  const [addedToCart, setAddedToCart] = useState<string | null>(null);

  const handleAddToCart = (id: string) => {
    setAddedToCart(id);
    setTimeout(() => setAddedToCart(null), 2000);
  };

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-terracotta-dark text-sm font-medium tracking-wider uppercase">Shop</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              Tools for Your Journey
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Beautiful, practical digital products to support your parenting and personal growth. Download instantly.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shopProducts.map((product, i) => {
              const Icon = typeIcons[product.type] || ShoppingBag;
              return (
                <AnimatedSection key={product.id} delay={i * 0.08}>
                  <div className="bg-cream rounded-2xl overflow-hidden border border-beige/50 hover:border-beige hover:shadow-xl transition-all duration-500 group flex flex-col">
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 bg-ivory/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-charcoal flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="font-serif text-xl text-charcoal mb-2 group-hover:text-sage-dark transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-warm-gray text-sm leading-relaxed mb-4 flex-grow">{product.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-beige">
                        <span className="font-serif text-2xl text-charcoal">${product.price}</span>
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          className={`px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-all duration-300 ${
                            addedToCart === product.id
                              ? 'bg-sage text-white'
                              : 'bg-sage text-white hover:bg-sage-dark'
                          }`}
                        >
                          {addedToCart === product.id ? (
                            <>
                              <Check className="w-4 h-4" /> Added
                            </>
                          ) : (
                            <>
                              Add to Cart <ShoppingBag className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bundle CTA */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-sage/5 rounded-3xl p-10 md:p-16 border border-sage/20 text-center">
              <Package className="w-12 h-12 text-sage mx-auto mb-6" />
              <h2 className="font-serif text-3xl text-charcoal mb-4">The Complete Parent Toolkit</h2>
              <p className="text-warm-gray text-lg mb-6 max-w-xl mx-auto">
                Get all digital products in one bundle. The planner, emotion cards, journal, workbook, and guided meditations — everything you need.
              </p>
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-soft-gray line-through text-lg">$172</span>
                <span className="font-serif text-4xl text-sage-dark">$97</span>
                <span className="bg-terracotta/10 text-terracotta-dark px-3 py-1 rounded-full text-sm font-medium">Save 44%</span>
              </div>
              <Link
                to="/contact"
                className="bg-sage text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all hover:shadow-lg"
              >
                Get the Bundle <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
