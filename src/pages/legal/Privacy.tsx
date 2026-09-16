import AnimatedSection from '../../components/ui/AnimatedSection';

export default function Privacy() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Legal</span>
          <h1 className="font-serif text-4xl text-charcoal mt-3 mb-8">Privacy Policy</h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-warm-gray leading-relaxed mb-6">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use our website and services.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Information We Collect</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account, book a session, purchase a course, or contact us. This may include your name, email address, phone number, and payment information.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">How We Use Your Information</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              We use your information to provide and improve our services, process payments, send you updates and resources, and communicate with you about your appointments and purchases.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Data Protection</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              We implement appropriate security measures to protect your personal information. All coaching sessions and communications are confidential.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Your Rights</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              You have the right to access, correct, or delete your personal information. Contact us if you wish to exercise these rights.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
