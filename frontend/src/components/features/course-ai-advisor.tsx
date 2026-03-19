"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Target, Users } from "lucide-react";

import { AiInsightCard } from "@/components/features/ai-insight-card";
import { AiSidePanelShell } from "@/components/features/ai-side-panel-shell";
import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { AiPageContextBridge, useAiUi } from "@/components/providers/ai-ui-provider";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-fetch";
import type { CourseAdvisorResponse } from "@/lib/ai-schemas";

async function fetchCourseAdvisor(courseId: string, currentPath: string): Promise<CourseAdvisorResponse> {
  const res = await apiPost("/api/ai/course-advisor", {
    course_id: courseId,
    current_path: currentPath,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Không thể tải Cố vấn khóa học AI.");
  }
  return payload?.data as CourseAdvisorResponse;
}

export function CourseAiAdvisor({
  courseId,
  courseSlug,
  courseTitle,
  currentPath,
  viewerCanChat,
}: {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  currentPath: string;
  viewerCanChat: boolean;
}) {
  const { openChat } = useAiUi();
  const [data, setData] = useState<CourseAdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageContextValue = useMemo(
    () => ({
      surface: "course_advisor" as const,
      title: "Cố vấn khóa học AI",
      description: "Đánh giá nhanh độ phù hợp, đầu vào cần có và các phần chính của khóa học đang xem.",
      starterPrompts: [
        `Khóa "${courseTitle}" phù hợp với ai?`,
        `Tôi cần biết gì trước khi học "${courseTitle}"?`,
        `Tóm tắt nhanh lộ trình của khóa "${courseTitle}".`,
      ],
      courseId,
      courseTitle,
      currentPath,
    }),
    [courseId, courseTitle, currentPath]
  );

  const loadAdvisor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCourseAdvisor(courseId, currentPath));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tải Cố vấn khóa học AI.");
    } finally {
      setLoading(false);
    }
  }, [courseId, currentPath]);

  useEffect(() => {
    void loadAdvisor();
  }, [loadAdvisor]);

  return (
    <>
      <AiPageContextBridge value={pageContextValue} />
      <AiSidePanelShell
        badgeLabel="Cố vấn khóa học AI"
        title="Đánh giá nhanh trước khi học"
        description="Dựa trên mô tả khóa học, mục tiêu, yêu cầu đầu vào, module và lesson hiện có trong hệ thống."
        onRefresh={loadAdvisor}
        refreshLabel="Làm mới"
      >
        <div className="space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4">
          {loading ? (
            <AiSurfaceState
              state="loading"
              title="Đang tổng hợp góc nhìn cho khóa học"
              description="AI đang đọc metadata, yêu cầu đầu vào, đối tượng phù hợp và outline để đưa ra tóm tắt hữu ích."
            />
          ) : error ? (
            <AiSurfaceState
              state="error"
              title="Không thể tải Cố vấn khóa học AI"
              description={error}
              actionLabel="Thử lại"
              onAction={loadAdvisor}
            />
          ) : !data ? (
            <AiSurfaceState
              state="empty"
              title="Chưa có dữ liệu tư vấn"
              description="Mở lại trang hoặc thử làm mới để tải phần tư vấn nhanh cho khóa học này."
              actionLabel="Làm mới"
              onAction={loadAdvisor}
            />
          ) : (
            <>
              <AiInsightCard
                title="Khóa học này phù hợp với ai"
                description={data.fit_summary}
                icon={<Target className="size-5" />}
              />

              {data.source_state === "metadata_only" ? (
                <AiSurfaceState
                  state="no-data"
                  title="Ngữ cảnh khóa học còn mỏng"
                  description="AI mới có ít metadata nên phần tư vấn hiện chỉ ở mức sơ bộ. Bạn vẫn có thể xem outline và hỏi tiếp trong chat."
                />
              ) : null}

              <AiInsightCard
                title="Bạn nên biết gì trước khi học"
                description={data.prerequisites_summary}
                icon={<BookOpenText className="size-5" />}
              />

              <AiInsightCard
                title="Ai sẽ hưởng lợi nhiều nhất"
                description={data.target_audience_summary}
                icon={<Users className="size-5" />}
              >
                {data.quick_syllabus.length > 0 ? (
                  <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Lộ trình nhanh
                    </p>
                    <ol className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-700">
                      {data.quick_syllabus.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </AiInsightCard>

              {viewerCanChat && data.follow_up_prompts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.follow_up_prompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto max-w-full rounded-full whitespace-normal [overflow-wrap:anywhere]"
                      onClick={() =>
                        openChat({
                          prefill: prompt,
                          contextOverride: pageContextValue,
                        })
                      }
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              ) : null}

              {viewerCanChat ? (
                <Button
                  type="button"
                  className="ai-action-primary w-full rounded-full"
                  onClick={() =>
                    openChat({
                      prefill: `Tư vấn thêm cho tôi về khóa "${courseTitle}" dựa trên outline hiện có.`,
                      contextOverride: pageContextValue,
                    })
                  }
                >
                  Tiếp tục trong chat
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button asChild className="ai-action-primary w-full rounded-full">
                  <a href={`/login?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`}>
                    Đăng nhập để tiếp tục với AI Chat
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </AiSidePanelShell>
    </>
  );
}
