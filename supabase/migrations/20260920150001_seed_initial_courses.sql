-- Migration: Seed initial courses from static catalog into database
-- Date: 2026-09-20 15:00:01

insert into public.courses (
  id,
  title,
  short_description,
  description,
  thumbnail_url,
  category,
  level,
  language,
  audience,
  prerequisites,
  outcomes,
  estimated_duration,
  price,
  currency,
  status,
  display_order
) values
(
  'parenting-confidence',
  'Parenting with Confidence',
  'Build unshakeable confidence in your parenting decisions with evidence-based strategies.',
  'Build unshakeable confidence in your parenting decisions with evidence-based strategies. Learn practical nervous-system regulation and connection tools for family calm.',
  'https://images.pexels.com/photos/3663037/pexels-photo-3663037.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Parenting',
  'Beginner',
  'English',
  'Parents of toddlers and school-age children seeking calm guidance.',
  array['Commitment to daily connection rituals'],
  array['Make decisions with clarity', 'Handle difficult moments calmly', 'Build stronger family connections'],
  '6 weeks',
  197,
  'USD',
  'published',
  1
),
(
  'burnout-recovery-course',
  'Burnout Recovery for Mothers',
  'A compassionate journey from exhaustion to renewal, designed specifically for mothers.',
  'A compassionate journey from exhaustion to renewal, designed specifically for mothers navigating chronic overwhelm.',
  'https://images.pexels.com/photos/3094218/pexels-photo-3094218.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Wellness',
  'Intermediate',
  'English',
  'Mothers experiencing chronic stress, fatigue, or depleted energy.',
  array['Openness to somatic self-compassion practices'],
  array['Recognize burnout signs early', 'Restore energy and joy', 'Create sustainable self-care routines'],
  '8 weeks',
  247,
  'USD',
  'published',
  2
),
(
  'emotional-resilience',
  'Raising Emotionally Resilient Children',
  'Teach your children the skills they need to navigate life''s challenges with grace.',
  'Teach your children the skills they need to navigate life''s challenges with grace and emotional security.',
  'https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Child Development',
  'Beginner',
  'English',
  'Parents wanting evidence-based emotional coaching for their kids.',
  array['No prerequisites'],
  array['Help children manage big emotions', 'Build problem-solving skills', 'Foster healthy coping mechanisms'],
  '5 weeks',
  177,
  'USD',
  'published',
  3
),
(
  'child-brain',
  'Understanding Your Child''s Brain',
  'Neuroscience made simple for parents who want to understand what''s really going on.',
  'Neuroscience made simple for parents who want to understand brain development and emotional co-regulation.',
  'https://images.pexels.com/photos/3755511/pexels-photo-3755511.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Neuroscience',
  'Intermediate',
  'English',
  'Curious parents interested in developmental psychology and neuroscience.',
  array['Basic understanding of child development stages'],
  array['Understand brain development stages', 'Respond to behaviour with empathy', 'Support healthy neural pathways'],
  '4 weeks',
  157,
  'USD',
  'published',
  4
),
(
  'nervous-system-reset',
  'Nervous System Reset',
  'Science-backed tools to regulate your nervous system and find calm in chaos.',
  'Science-backed tools to regulate your nervous system, shift out of fight-or-flight, and find sustained calm in family life.',
  'https://images.pexels.com/photos/3822166/pexels-photo-3822166.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Wellness',
  'Beginner',
  'English',
  'Parents experiencing physical tension, reactivity, or anxiety.',
  array['Willingness to practice breathing and grounding exercises'],
  array['Recognize nervous system states', 'Apply regulation techniques', 'Build long-term resilience'],
  '6 weeks',
  197,
  'USD',
  'published',
  5
),
(
  'puberty-prep',
  'Preparing Children for Puberty',
  'Navigate the pre-teen and teen years with confidence and open communication.',
  'Navigate the pre-teen and teen years with confidence, bodily positivity, and open parent-child communication.',
  'https://images.pexels.com/photos/3184436/pexels-photo-3184436.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Child Development',
  'Intermediate',
  'English',
  'Parents of children aged 8-13 approaching adolescence.',
  array['Comfortable discussing biological changes'],
  array['Have age-appropriate conversations', 'Build trust and openness', 'Support healthy development'],
  '4 weeks',
  147,
  'USD',
  'published',
  6
)
on conflict (id) do update set
  title = excluded.title,
  short_description = excluded.short_description,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  category = excluded.category,
  level = excluded.level,
  price = excluded.price,
  status = excluded.status;

-- Seed initial module and lesson for parenting-confidence
insert into public.course_modules (
  id,
  course_id,
  title,
  description,
  duration,
  display_order,
  status
) values (
  'm1',
  'parenting-confidence',
  'Understanding Your Parenting Style',
  'Discover your core parenting tendencies and how they influence your child''s nervous system.',
  '45 min',
  0,
  'published'
) on conflict (id) do nothing;

insert into public.course_lessons (
  id,
  module_id,
  course_id,
  title,
  description,
  duration,
  bunny_video_id,
  is_preview,
  status,
  display_order
) values (
  'v1',
  'm1',
  'parenting-confidence',
  'Introduction to Confident Parenting',
  'In this foundational lesson, we break down how to lead your home with emotional safety rather than fear or exhaustion.',
  '12 min',
  null,
  false,
  'published',
  0
) on conflict (id) do nothing;

insert into public.course_materials (
  id,
  lesson_id,
  course_id,
  title,
  type,
  file_path,
  external_url,
  display_order,
  is_enrolled_only
) values (
  'r1',
  'v1',
  'parenting-confidence',
  'Parenting Style Assessment',
  'pdf',
  null,
  'https://example.com/parenting-style-assessment.pdf',
  0,
  true
) on conflict (id) do nothing;
