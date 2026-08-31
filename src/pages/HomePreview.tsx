import PreviewBanner from '../components/sections/PreviewBanner';
import HeroSection from '../components/sections/HeroSection';
import TrustBar from '../components/sections/TrustBar';
import PainPointsSection from '../components/sections/PainPointsSection';
import ApproachSection from '../components/sections/ApproachSection';
import FeaturedServicesSection from '../components/sections/FeaturedServicesSection';
import FeaturedCoursesSection from '../components/sections/FeaturedCoursesSection';
import OutcomesSection from '../components/sections/OutcomesSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import AboutMaiTeaser from '../components/sections/AboutMaiTeaser';
import FAQTeaser from '../components/sections/FAQTeaser';
import FinalBookingCTA from '../components/sections/FinalBookingCTA';
import CTASection from '../components/CTASection';

/**
 * Static redesign preview — does not replace src/pages/Home.tsx.
 * Preview at /home-preview
 */
export default function HomePreview() {
  return (
    <div className="min-h-screen bg-ivory">
      <PreviewBanner />
      <HeroSection />
      <TrustBar />
      <PainPointsSection />
      <ApproachSection />
      <FeaturedServicesSection />
      <FeaturedCoursesSection />
      <OutcomesSection />
      <TestimonialsSection />
      <AboutMaiTeaser />
      <FAQTeaser />
      <CTASection
        title="Start with free resources"
        description="Guides, checklists, and worksheets — no commitment, just support while you decide your next step."
        primaryAction={{ label: 'Get free resources', href: '/resources' }}
        secondaryAction={{ label: 'Join the community', href: '/community' }}
        variant="sage"
      />
      <FinalBookingCTA />
    </div>
  );
}
