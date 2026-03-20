export const CURRENT_USER_FIELD_LIST = [
  "id",
  "first_name",
  "last_name",
  "email",
  "avatar",
  "role.id",
  "role.name",
  "status",
  "instructor_state",
  "bio",
  "phone",
  "headline",
  "social_links",
  "date_created",
] as const;

export const CURRENT_USER_FIELDS = CURRENT_USER_FIELD_LIST.join(",");

export const INSTRUCTOR_COURSE_SUMMARY_FIELDS = [
  "id",
  "title",
  "slug",
  "thumbnail",
  "price",
  "discount_price",
  "status",
  "average_rating",
  "date_created",
  "category_id.id",
  "category_id.name",
].join(",");

export const COURSE_REVIEW_FIELDS = [
  "id",
  "course_id",
  "rating",
  "comment",
  "status",
  "instructor_reply",
  "instructor_reply_at",
  "date_created",
  "user_id.id",
  "user_id.first_name",
  "user_id.last_name",
  "user_id.email",
  "user_id.avatar",
].join(",");

export const ENROLLMENT_FIELDS = [
  "id",
  "user_id",
  "course_id.id",
  "course_id.title",
  "course_id.slug",
  "course_id.thumbnail",
  "course_id.total_lessons",
  "course_id.total_duration",
  "course_id.average_rating",
  "course_id.level",
  "course_id.category_id.id",
  "course_id.category_id.name",
  "last_lesson_id.id",
  "last_lesson_id.title",
  "last_lesson_id.slug",
  "status",
  "enrolled_at",
  "progress_percentage",
  "completed_at",
  "date_created",
].join(",");

export const PROGRESS_FIELDS = [
  "id",
  "enrollment_id",
  "lesson_id.id",
  "lesson_id.title",
  "lesson_id.slug",
  "completed",
  "video_position",
  "completed_at",
].join(",");

export const CART_ITEM_FIELDS = [
  "id",
  "date_created",
  "course_id.id",
  "course_id.title",
  "course_id.slug",
  "course_id.thumbnail",
  "course_id.price",
  "course_id.discount_price",
  "course_id.instructors.user_id.first_name",
  "course_id.instructors.user_id.last_name",
].join(",");

export const CART_CHECKOUT_ITEM_FIELDS = [
  "id",
  "course_id.id",
  "course_id.title",
  "course_id.slug",
  "course_id.price",
  "course_id.discount_price",
].join(",");

export const WISHLIST_ITEM_FIELDS = [
  "id",
  "date_created",
  "course_id.id",
  "course_id.title",
  "course_id.slug",
  "course_id.thumbnail",
  "course_id.price",
  "course_id.discount_price",
  "course_id.average_rating",
  "course_id.total_enrollments",
].join(",");

const ORDER_ITEM_FIELDS = [
  "items.id",
  "items.price",
  "items.course_id.id",
  "items.course_id.title",
  "items.course_id.slug",
  "items.course_id.thumbnail",
];

const ORDER_BASE_FIELDS = [
  "id",
  "order_number",
  "total_amount",
  "status",
  "payment_method",
  "payment_ref",
  "date_created",
  "paid_at",
];

export const ORDER_LIST_FIELDS = [...ORDER_BASE_FIELDS, ...ORDER_ITEM_FIELDS].join(",");
export const ORDER_DETAIL_FIELDS = ORDER_LIST_FIELDS;

export const ORDER_DETAIL_WITH_USER_FIELDS = [
  ...ORDER_BASE_FIELDS,
  "user_id.id",
  "user_id.first_name",
  "user_id.last_name",
  "user_id.email",
  "user_id.avatar",
  "user_id.phone",
  ...ORDER_ITEM_FIELDS,
].join(",");

export const ORDER_PAYMENT_FIELDS = [
  ...ORDER_BASE_FIELDS,
  "items.course_id.id",
  "items.course_id.slug",
].join(",");

const QUIZ_NESTED_FIELDS = [
  "questions.id",
  "questions.question_text",
  "questions.question_type",
  "questions.explanation",
  "questions.sort",
  "questions.points",
  "questions.answers.id",
  "questions.answers.answer_text",
  "questions.answers.is_correct",
  "questions.answers.sort",
];

export const QUIZ_EDITOR_FIELDS = [
  "id",
  "title",
  "description",
  "passing_score",
  "time_limit",
  "max_attempts",
  "lesson_id.id",
  ...QUIZ_NESTED_FIELDS,
].join(",");

export const QUIZ_SUBMISSION_FIELDS = [
  "id",
  "passing_score",
  "max_attempts",
  "lesson_id.id",
  "lesson_id.module_id.course_id.id",
  ...QUIZ_NESTED_FIELDS,
].join(",");

export const ADMIN_COURSE_DETAIL_FIELDS = [
  "id",
  "title",
  "slug",
  "description",
  "content",
  "thumbnail",
  "level",
  "language",
  "promo_video_url",
  "price",
  "discount_price",
  "is_featured",
  "average_rating",
  "total_enrollments",
  "total_lessons",
  "total_duration",
  "what_you_learn",
  "requirements",
  "target_audience",
  "status",
  "date_created",
  "date_updated",
  "category_id.id",
  "category_id.name",
  "instructors.id",
  "instructors.user_id.id",
  "instructors.user_id.first_name",
  "instructors.user_id.last_name",
  "instructors.user_id.email",
  "instructors.user_id.avatar",
  "modules.id",
  "modules.title",
  "modules.sort",
  "modules.lessons.id",
  "modules.lessons.title",
  "modules.lessons.slug",
  "modules.lessons.type",
  "modules.lessons.duration",
  "modules.lessons.is_free",
  "modules.lessons.sort",
  "modules.lessons.status",
  "modules.lessons.content",
  "reviews.id",
  "reviews.rating",
  "reviews.comment",
  "reviews.status",
  "reviews.date_created",
  "reviews.user_id.id",
  "reviews.user_id.first_name",
  "reviews.user_id.last_name",
].join(",");
