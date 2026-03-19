export type UserRole = "admin" | "instructor" | "student";

export interface DirectusUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
  role: string | DirectusRole;
  status: string;
  instructor_state?: "NONE" | "APPROVED" | "SUSPENDED" | "REVOKED" | null;
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
  certificate?: string | Certificate | null;
}

export interface Certificate {
  id: string;
  user_id: string | DirectusUser;
  course_id: string | Course;
  enrollment_id: string | Enrollment;
  certificate_code: string;
  issued_at: string | null;
  is_deleted?: boolean;
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
  instructor_reply: string | null;
  instructor_reply_at: string | null;
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

export interface Assignment {
  id: string;
  lesson_id: string | Lesson;
  title: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  status: "draft" | "published" | "archived";
  rubric?: AssignmentRubric | null;
  submissions?: AssignmentSubmission[];
  date_created?: string | null;
  date_updated?: string | null;
}

export interface AssignmentRubric {
  id: string;
  assignment_id: string | Assignment;
  criteria?: AssignmentRubricCriterion[];
}

export interface AssignmentRubricCriterion {
  id: string;
  rubric_id: string | AssignmentRubric;
  title: string;
  description: string | null;
  max_points: number;
  scoring_guidance: string | null;
  sort: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string | Assignment;
  user_id: string | DirectusUser;
  body_text: string;
  reference_url: string | null;
  status: "submitted" | "reviewed";
  submitted_at: string | null;
  reviewed_at: string | null;
  review?: AssignmentReview | null;
  ai_artifacts?: AiReviewArtifact[];
}

export interface AssignmentCriterionScore {
  criterion_id: string;
  title: string;
  max_points: number;
  score: number;
  rationale?: string | null;
}

export interface AssignmentReview {
  id: string;
  submission_id: string | AssignmentSubmission;
  reviewer_id: string | DirectusUser;
  status: "draft" | "finalized";
  final_score: number;
  criterion_scores: AssignmentCriterionScore[] | null;
  final_feedback: string | null;
  date_created?: string | null;
  date_updated?: string | null;
}

export interface AiReviewArtifact {
  id: string;
  submission_id: string | AssignmentSubmission;
  model: string;
  prompt_version: string;
  payload: Record<string, unknown> | null;
  applied_state: "pending" | "applied" | "ignored";
  date_created?: string | null;
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

export type InstructorApplicationTrack = "PORTFOLIO" | "DEMO" | "DOCUMENT";
export type InstructorApplicationStatus =
  | "PENDING"
  | "NEEDS_INFO"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type InstructorReactivationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type InstructorState = "NONE" | "APPROVED" | "SUSPENDED" | "REVOKED";

export interface InstructorApplication {
  id: string;
  user_id: string | DirectusUser;
  track: InstructorApplicationTrack;
  expertise_categories: string[] | null;
  expertise_description: string;
  portfolio_links: string[] | null;
  demo_video_link: string | null;
  course_outline: string | null;
  document_urls: string[] | null;
  terms_accepted: boolean;
  status: InstructorApplicationStatus;
  admin_note: string | null;
  reviewed_by: string | DirectusUser | null;
  reviewed_at: string | null;
  date_created: string;
  date_updated: string | null;
}

export interface ApplicationHistory {
  id: string;
  application_id: string | InstructorApplication;
  from_status: InstructorApplicationStatus | null;
  to_status: InstructorApplicationStatus;
  changed_by: string | DirectusUser | null;
  note: string | null;
  date_created: string;
}

export interface InstructorReactivationRequest {
  id: string;
  user_id: string | DirectusUser;
  status: InstructorReactivationStatus;
  reason: string | null;
  admin_note: string | null;
  reviewed_by: string | DirectusUser | null;
  reviewed_at: string | null;
  date_created: string;
  date_updated: string | null;
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
  certificates: Certificate[];
  progress: Progress[];
  reviews: Review[];
  quizzes: Quiz[];
  quiz_questions: QuizQuestion[];
  quiz_answers: QuizAnswer[];
  quiz_attempts: QuizAttempt[];
  notifications: Notification[];
  instructor_applications: InstructorApplication[];
  application_history: ApplicationHistory[];
  instructor_reactivation_requests: InstructorReactivationRequest[];
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
