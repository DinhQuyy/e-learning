export type PortalNavIcon =
  | "dashboard"
  | "profile"
  | "courses"
  | "wishlist"
  | "certificates"
  | "orders"
  | "notifications"
  | "cart"
  | "reviews"
  | "instructor-application"
  | "new-course";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: PortalNavIcon;
}

export const studentPortalNavItems: PortalNavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: "dashboard" },
  { label: "Hồ sơ", href: "/profile", icon: "profile" },
  { label: "Khóa học của tôi", href: "/my-courses", icon: "courses" },
  { label: "Yêu thích", href: "/wishlist", icon: "wishlist" },
  { label: "Chứng chỉ", href: "/my-certificates", icon: "certificates" },
  { label: "Đơn hàng", href: "/orders", icon: "orders" },
  { label: "Thông báo", href: "/notifications", icon: "notifications" },
  { label: "Giỏ hàng", href: "/cart", icon: "cart" },
  {
    label: "Trở thành giảng viên",
    href: "/become-instructor",
    icon: "instructor-application",
  },
];

export const instructorPortalNavItems: PortalNavItem[] = [
  { label: "Tổng quan", href: "/instructor/dashboard", icon: "dashboard" },
  { label: "Hồ sơ", href: "/instructor/profile", icon: "profile" },
  { label: "Khóa học", href: "/instructor/courses", icon: "courses" },
  { label: "Tạo khóa học", href: "/instructor/courses/new", icon: "new-course" },
];
