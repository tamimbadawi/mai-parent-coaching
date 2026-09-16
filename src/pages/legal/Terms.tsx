import AnimatedSection from '../components/AnimatedSection';

export default function Terms() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Legal</span>
          <h1 className="font-serif text-4xl text-charcoal mt-3 mb-8">Terms & Conditions</h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-warm-gray leading-relaxed mb-6">
              By using this website and our services, you agree to these terms. Please read them carefully.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Services</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              Our coaching services are educational and supportive in nature. They are not a substitute for medical or mental health treatment. If you or your child are experiencing a mental health crisis, please contact emergency services or a qualified mental health professional.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Payments & Refunds</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              Course purchases can be refunded within 14 days if less than 30% of the content has been accessed. Coaching session cancellations within 24 hours may be subject to a 50% fee.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Intellectual Property</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              All content on this website, including courses, worksheets, and resources, is protected by copyright. You may not reproduce, distribute, or create derivative works without permission.
            </p>
            <h2 className="font-serif text-2xl text-charcoal mt-8 mb-4">Limitation of Liability</h2>
            <p className="text-warm-gray leading-relaxed mb-4">
              We are not liable for any direct, indirect, or consequential damages arising from your use of our services or website.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
