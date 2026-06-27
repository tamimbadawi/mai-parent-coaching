import AnimatedSection from '../components/AnimatedSection';

export default function Cookies() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Legal</span>
          <h1 className="font-serif text-4xl text-charcoal mt-3 mb-8">Cookie Policy</h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-warm-gray leading-relaxed mb-6">
              This website uses cookies to improve your experience. By continuing to use our site, you consent to our use of cookies.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">What Are Cookies</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and understand how you use our site.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">How We Use Cookies</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              We use essential cookies for site functionality, analytics cookies to understand usage patterns, and preference cookies to remember your settings.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Managing Cookies</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              You can control cookies through your browser settings. Please note that disabling cookies may affect your experience on our website.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
