/**
 * Shared validation utilities for API routes.
 */

const MAX_PAGE = 1000;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Clamp pagination params to safe bounds.
 */
export function sanitizePagination(
  rawPage: string | null,
  rawLimit: string | null,
  defaultLimit = DEFAULT_LIMIT
): { page: number; limit: number; offset: number } {
  let page = Number(rawPage) || DEFAULT_PAGE;
  let limit = Number(rawLimit) || defaultLimit;

  page = Math.max(1, Math.min(page, MAX_PAGE));
  limit = Math.max(1, Math.min(limit, MAX_LIMIT));

  return { page, limit, offset: (page - 1) * limit };
}

const VALID_COURSE_STATUSES = new Set(["draft", "review", "published", "archived"]);
const VALID_ORDER_STATUSES = new Set(["pending", "success", "failed", "cancelled"]);
const VALID_REVIEW_STATUSES = new Set(["pending", "approved", "rejected", "hidden"]);
const VALID_USER_STATUSES = new Set(["active", "suspended", "invited"]);
const VALID_CATEGORY_STATUSES = new Set(["published", "draft", "archived"]);

export function isValidCourseStatus(status: string): boolean {
  return VALID_COURSE_STATUSES.has(status);
}

export function isValidOrderStatus(status: string): boolean {
  return VALID_ORDER_STATUSES.has(status);
}

export function isValidReviewStatus(status: string): boolean {
  return VALID_REVIEW_STATUSES.has(status);
}

export function isValidUserStatus(status: string): boolean {
  return VALID_USER_STATUSES.has(status);
}

export function isValidCategoryStatus(status: string): boolean {
  return VALID_CATEGORY_STATUSES.has(status);
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && slug.length <= 200;
}

const MAX_SEARCH_LENGTH = 200;

export function sanitizeSearch(raw: string | null): string {
  if (!raw) return "";
  return raw.slice(0, MAX_SEARCH_LENGTH).trim();
}
