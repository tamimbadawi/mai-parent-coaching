export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  price?: string;
  duration?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessons: number;
  price: number;
  category: string;
  outcomes: string[];
  modules: CourseModule[];
}

export interface CourseModule {
  id: string;
  title: string;
  duration: string;
  videos: Video[];
  resources: Resource[];
}

export interface Video {
  id: string;
  title: string;
  duration: string;
  url: string;
  bunnyVideoId?: string;
  bunnyCollectionId?: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'worksheet' | 'audio';
  url: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  image: string;
  readTime: string;
  tags: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  image?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FreeResource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'checklist' | 'worksheet' | 'guide';
  thumbnail: string;
  downloadUrl: string;
}

export interface AppointmentType {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
  buffer: number;
}

export interface Booking {
  id: string;
  user_id: string | null;
  appointment_type_id: string;
  appointment_type_title: string;
  appointment_date: string;
  appointment_time: string;
  time_zone: string;
  starts_at: string;
  ends_at: string;
  reserved_until: string;
  parent_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  child_name: string | null;
  child_age: string | null;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'pending_calendar_sync';
  created_at: string;
  updated_at: string;
  google_calendar_event_id: string | null;
  google_meet_url: string | null;
}

export interface CoachAvailabilityRule {
  id: string;
  rule_type: 'recurring' | 'date_override' | 'date_closed';
  day_of_week: number | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  specific_date: string | null; // 'YYYY-MM-DD'
  start_time: string | null; // 'HH:MM'
  end_time: string | null; // 'HH:MM'
  appointment_type_id: string; // 'all' or specific appointment type id
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface BookingBlackout {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
  created_by: string | null;
}

export interface BookingSettings {
  id: string;
  working_days: number[];
  work_start_hour: number;
  work_end_hour: number;
  slot_interval_minutes: number;
  booking_notice_hours: number;
  time_zone: string;
  updated_at: string;
}

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  type: 'planner' | 'cards' | 'journal' | 'workbook' | 'ebook' | 'toolkit' | 'audio';
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  likes: number;
  replies: number;
  category: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  role: 'student' | 'admin';
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminNotification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  payment_intent_id: string | null;
  amount_paid: number | null;
  status: 'active' | 'refunded' | 'suspended';
}

export interface VideoProgress {
  id: string;
  user_id: string;
  course_id: string;
  video_id: string;
  progress_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: UserProfile | null;
  loading: boolean;
  enrollments: CourseEnrollment[];
}
