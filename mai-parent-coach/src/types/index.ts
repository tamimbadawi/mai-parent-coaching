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
  appointmentTypeId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  clientName: string;
  clientEmail: string;
  notes?: string;
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
