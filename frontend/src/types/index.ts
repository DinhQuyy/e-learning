export type UserRole = "admin" | "instructor" | "student";

export interface DirectusUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  role: string | DirectusRole;
  status: string;
  bio: string | null;
  phone: string | null;
  headline: string | null;
  social_links: Record<string, string> | null;
  date_created: string | null;
}

export interface DirectusRole {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | Category | null;
  sort: number;
  status: "published" | "draft";
  date_created: string;
  courses?: Course[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  content: string | null;
  thumbnail: string | null;
  category_id: string | Category | null;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  price: number;
  discount_price: number | null;
  promo_video_url: string | null;
  is_featured: boolean;
  target_audience: string[] | null;
  total_enrollments: number;
  average_rating: number;
  // Derived at runtime from approved reviews; optional because not always hydrated
  review_count?: number;
  // Derived at runtime from enrollments; optional
  enrollment_count?: number;
  total_lessons: number;
  total_duration: number;
  status: "draft" | "review" | "published" | "archived";
  requirements: string[] | null;
  what_you_learn: string[] | null;
  date_created: string;
  date_updated: string | null;
  instructors?: CourseInstructor[];
  modules?: Module[];
  reviews?: Review[];
  enrollments?: Enrollment[];
}

export interface CourseInstructor {
  id: string;
  course_id: string | Course;
  user_id: string | DirectusUser;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  course_id: string | Course;
  sort: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  type: "video" | "text";
  content: string | null;
  video_url: string | null;
  duration: number;
  module_id: string | Module;
  sort: number;
  is_free: boolean;
  status: "published" | "draft";
  date_created: string;
  quizzes?: Quiz[];
}

export interface Enrollment {
  id: string;
  user_id: string | DirectusUser;
  course_id: string | Course;
  status: "active" | "completed" | "cancelled";
  last_lesson_id: string | Lesson | null;
  enrolled_at: string;
  progress_percentage: number;
  completed_at: string | null;
  date_created: string;
}

export interface Progress {
  id: string;
  enrollment_id: string | Enrollment;
  lesson_id: string | Lesson;
  completed: boolean;
  video_position: number;
  completed_at: string | null;
}

export interface Review {
  id: string;
  user_id: string | DirectusUser;
  course_id: string | Course;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  date_created: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  lesson_id: string | Lesson;
  passing_score: number;
  time_limit: number;
  max_attempts: number;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string | Quiz;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "single_choice";
  sort: number;
  points: number;
  explanation: string | null;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  question_id: string | QuizQuestion;
  answer_text: string;
  is_correct: boolean;
  sort: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string | Quiz;
  user_id: string | DirectusUser;
  score: number;
  passed: boolean;
  answers: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string | DirectusUser;
  title: string;
  message: string | null;
  type: "info" | "success" | "warning" | "enrollment" | "review" | "system";
  is_read: boolean;
  link: string | null;
  date_created: string;
}

// E-Commerce types
export interface CartItem {
  id: string;
  user_id: string | DirectusUser;
  course_id: string | Course;
  date_created: string;
}

export interface WishlistItem {
  id: string;
  user_id: string | DirectusUser;
  course_id: string | Course;
  date_created: string;
}

export type OrderStatus = "pending" | "success" | "failed" | "cancelled";
export type PaymentMethod = "vnpay" | "momo" | "bank_transfer";

export interface Order {
  id: string;
  user_id: string | DirectusUser;
  order_number: string;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_ref: string | null;
  date_created: string;
  paid_at: string | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string | Order;
  course_id: string | Course;
  price: number;
}

// Directus SDK Schema
export interface Schema {
  categories: Category[];
  courses: Course[];
  courses_instructors: CourseInstructor[];
  modules: Module[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  progress: Progress[];
  reviews: Review[];
  quizzes: Quiz[];
  quiz_questions: QuizQuestion[];
  quiz_answers: QuizAnswer[];
  quiz_attempts: QuizAttempt[];
  notifications: Notification[];
  cart_items: CartItem[];
  wishlists: WishlistItem[];
  orders: Order[];
  order_items: OrderItem[];
  directus_users: DirectusUser[];
  directus_roles: DirectusRole[];
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total_count: number;
    filter_count: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}
