import type { AiFaqBlockConfig } from "@/lib/ai-ui-types";

export const dashboardAiFaq: AiFaqBlockConfig = {
  eyebrow: "Help / FAQ",
  title: "Hỏi nhanh trên dashboard",
  description: "Các câu hỏi vận hành phổ biến để tiếp tục học mà không cần mò trong nhiều màn hình.",
  items: [
    {
      title: "Tiếp tục học từ đâu?",
      body: "Mở đúng khóa học hoặc bài học đang dở ngay từ dashboard.",
      cta_label: "Hỏi AI",
      cta_prefill: "Từ dashboard hiện tại, tôi nên tiếp tục học từ đâu và vì sao?",
    },
    {
      title: "Xem tiến độ ở đâu?",
      body: "Nhờ AI chỉ nhanh khu vực xem tiến độ và khóa học đang chậm.",
      cta_label: "Hỏi AI",
      cta_prefill: "Trên dashboard này, tôi xem tiến độ học tập chi tiết ở đâu?",
    },
    {
      title: "Khi nào có chứng chỉ?",
      body: "Xem điều kiện hoàn thành trước khi mong chờ chứng chỉ.",
      cta_label: "Hỏi AI",
      cta_prefill: "Khi nào tôi đủ điều kiện nhận chứng chỉ cho khóa học đã học?",
    },
  ],
};

export function buildCourseAiFaq(
  courseTitle: string,
  courseSlug: string,
  canUseChat: boolean
): AiFaqBlockConfig {
  const loginHref = `/login?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`;

  return {
    eyebrow: "Help / FAQ",
    title: "Hỏi nhanh trước khi đăng ký",
    description: "Các câu hỏi ngắn gọn để quyết định nhanh xem khóa học này có phù hợp với bạn không.",
    items: [
      {
        title: "Khóa này dành cho ai?",
        body: "Nhờ AI tóm tắt nhanh đối tượng phù hợp và mức đầu vào.",
        cta_label: canUseChat ? "Hỏi AI" : "Đăng nhập",
        cta_prefill: canUseChat ? `Khóa "${courseTitle}" phù hợp với ai nhất?` : undefined,
        cta_href: canUseChat ? undefined : loginHref,
      },
      {
        title: "Cần biết gì trước khi học?",
        body: "Kiểm tra yêu cầu nền tảng trước khi mua hoặc bắt đầu.",
        cta_label: canUseChat ? "Hỏi AI" : "Đăng nhập",
        cta_prefill: canUseChat ? `Tôi cần biết gì trước khi học khóa "${courseTitle}"?` : undefined,
        cta_href: canUseChat ? undefined : loginHref,
      },
      {
        title: "Cách đăng ký khóa học",
        body: "Đi thẳng tới trang thanh toán hoặc thêm vào giỏ hàng.",
        cta_label: "Mở khóa học",
        cta_href: `/courses/${courseSlug}#overview`,
      },
    ],
  };
}

export function buildLessonAiFaq(lessonTitle: string, courseTitle: string): AiFaqBlockConfig {
  return {
    eyebrow: "Help / FAQ",
    title: "Hỏi nhanh trong bài học",
    description: "Các thao tác thường gặp khi bạn đang học, làm quiz và cần quay lại nội dung liên quan.",
    items: [
      {
        title: "Đánh dấu hoàn thành",
        body: "Nhờ AI chỉ nhanh cách đánh dấu hoàn thành và đi tiếp.",
        cta_label: "Hỏi AI",
        cta_prefill: `Trong bài "${lessonTitle}" của khóa "${courseTitle}", tôi đánh dấu hoàn thành ở đâu?`,
      },
      {
        title: "Xem lại sau khi nộp quiz",
        body: "Hỏi AI đường đi nhanh tới phần review và bài học liên quan.",
        cta_label: "Hỏi AI",
        cta_prefill: `Sau khi nộp quiz trong bài "${lessonTitle}", tôi xem lại kết quả và bài liên quan ở đâu?`,
      },
      {
        title: "Tiếp tục bài kế tiếp",
        body: "Nhờ AI gợi ý bài tiếp theo và thứ tự ôn lại nếu cần.",
        cta_label: "Hỏi AI",
        cta_prefill: `Sau bài "${lessonTitle}", tôi nên học tiếp gì hoặc ôn lại gì trước?`,
      },
    ],
  };
}
