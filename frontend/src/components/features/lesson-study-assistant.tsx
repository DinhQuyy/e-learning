"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpenText, Lightbulb, NotebookPen } from "lucide-react";

import { AiChatPanel } from "@/components/features/ai-chat-panel";
import { AiInsightCard } from "@/components/features/ai-insight-card";
import { AiSidePanelShell } from "@/components/features/ai-side-panel-shell";
import { AiSurfaceState } from "@/components/features/ai-surface-state";
import { AiPageContextBridge, useAiUi } from "@/components/providers/ai-ui-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import { trackAiEvent } from "@/lib/ai-tracking";
import type {
  LessonReferenceIntent,
  LessonReferencesResponse,
  LessonStudyResponse,
} from "@/lib/ai-schemas";

type ExplainMode = "beginner" | "example" | "notes";
type StudyTab = "summary" | "qa" | "references" | "pitfalls";

const REFERENCE_LABELS: Record<LessonReferenceIntent, string> = {
  foundations: "Nền tảng",
  read_more: "Đọc thêm",
  examples: "Ví dụ",
  advanced: "Nâng cao",
};

async function fetchLessonStudy(lessonId: string, currentPath: string): Promise<LessonStudyResponse> {
  const res = await apiPost("/api/ai/lesson-study", {
    lesson_id: lessonId,
    current_path: currentPath,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Không thể phân tích bài học này.");
  }
  return payload?.data as LessonStudyResponse;
}

async function fetchLessonReferences(
  lessonId: string,
  intent: LessonReferenceIntent
): Promise<LessonReferencesResponse> {
  const params = new URLSearchParams({ lesson_id: lessonId, intent });
  const res = await apiFetch(`/api/ai/lesson-references?${params.toString()}`);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Không thể tải tài liệu tham khảo.");
  }
  return payload?.data as LessonReferencesResponse;
}

function StudyNoDataState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <AiSurfaceState state="no-data" title={title} description={description} />;
}

function LessonSummarySection({ data }: { data: LessonStudyResponse }) {
  return (
    <div className="space-y-4">
      <AiInsightCard title="Tóm tắt bài học" description={data.summary} icon={<BookOpenText className="size-5" />} />

      <AiInsightCard title="Ý chính" description="Những điểm cần nắm trước khi chuyển sang phần tiếp theo.">
        <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
          {data.key_points.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </AiInsightCard>

      <AiInsightCard title="Câu hỏi tự kiểm tra" description="Tự hỏi lại để biết bạn đã hiểu chắc nội dung hay chưa.">
        <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
          {data.self_check_questions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </AiInsightCard>
    </div>
  );
}

function LessonQaSection({
  data,
  explainMode,
  onExplainModeChange,
}: {
  data: LessonStudyResponse;
  explainMode: ExplainMode;
  onExplainModeChange: (mode: ExplainMode) => void;
}) {
  const explanationTitle =
    explainMode === "beginner"
      ? "Giải thích cho người mới"
      : explainMode === "example"
        ? "Giải thích bằng ví dụ"
        : "Chuyển thành ghi chú";
  const explanationDescription =
    explainMode === "beginner"
      ? "Phiên bản đơn giản, ít thuật ngữ và dễ tiếp cận hơn."
      : explainMode === "example"
        ? "Một ví dụ cụ thể để neo lại ý chính của bài học."
        : "Các gạch đầu dòng ngắn để dùng như ghi chú học nhanh.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={explainMode === "beginner" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => onExplainModeChange("beginner")}
        >
          Giải thích cho người mới
        </Button>
        <Button
          type="button"
          variant={explainMode === "example" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => onExplainModeChange("example")}
        >
          Giải thích bằng ví dụ
        </Button>
        <Button
          type="button"
          variant={explainMode === "notes" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => onExplainModeChange("notes")}
        >
          Chuyển thành ghi chú
        </Button>
      </div>

      <AiInsightCard
        title={explanationTitle}
        description={explanationDescription}
        icon={<NotebookPen className="size-5" />}
        trustTone="advisory"
      >
        {explainMode === "notes" ? (
          <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {data.study_notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-7 text-slate-700">
            {explainMode === "beginner" ? data.simple_explanation : data.example_explanation}
          </p>
        )}
      </AiInsightCard>

      {data.follow_up_prompts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.follow_up_prompts.map((prompt) => (
            <span key={prompt} className="ai-badge ai-badge--soft ai-badge--neutral">
              {prompt}
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-slate-200 bg-white/80">
        <AiChatPanel
          compact
          className="min-h-[360px]"
          emptyTitle="Hỏi & đáp theo đúng bài học này"
          emptyDescription="Khung chat dùng chung state với AI toàn cục, nhưng vẫn bám ngữ cảnh lesson hiện tại để đào sâu nội dung."
          inputPlaceholder="Hỏi sâu hơn về bài học này..."
        />
      </div>
    </div>
  );
}

function LessonReferencesSection({
  referencesData,
  referencesLoading,
  referencesError,
  referenceIntent,
  onReferenceIntentChange,
}: {
  referencesData: LessonReferencesResponse | null;
  referencesLoading: boolean;
  referencesError: string | null;
  referenceIntent: LessonReferenceIntent;
  onReferenceIntentChange: (intent: LessonReferenceIntent) => void;
}) {
  if (referencesLoading) {
    return (
      <AiSurfaceState
        state="loading"
        title="Đang tìm nội dung tham khảo"
        description="AI đang ưu tiên nội dung nội bộ trước, sau đó mới bổ sung nguồn ngoài đã được duyệt khi thật sự phù hợp."
      />
    );
  }

  if (referencesError) {
    return (
      <AiSurfaceState
        state="error"
        title="Không thể tải nội dung tham khảo"
        description={referencesError}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["foundations", "read_more", "examples", "advanced"] as LessonReferenceIntent[]).map((intent) => (
          <Button
            key={intent}
            type="button"
            size="sm"
            variant={referenceIntent === intent ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              trackAiEvent("lesson_reference_filter_change", { intent });
              onReferenceIntentChange(intent);
            }}
          >
            {REFERENCE_LABELS[intent]}
          </Button>
        ))}
      </div>

      {referencesData?.items.length ? (
        <div className="grid gap-3">
          {referencesData.items.map((item) => {
            const isExternal = item.source_type === "external";
            return (
              <Link
                key={`${item.kind}-${item.cta_href}-${item.title}`}
                href={item.cta_href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
                className="ai-insight-card ai-insight-card--neutral rounded-[22px] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() =>
                  trackAiEvent("lesson_reference_click", {
                    intent: referenceIntent,
                    kind: item.kind,
                    source_type: item.source_type,
                    href: item.cta_href,
                  })
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ai-badge ai-badge--soft ai-badge--neutral">
                    {item.kind === "resource"
                      ? "Tài liệu"
                      : item.kind === "course"
                        ? "Khóa học"
                        : item.kind === "module"
                          ? "Mô-đun"
                          : "Bài học"}
                  </span>
                  <span
                    className={`ai-badge ai-badge--soft ${
                      isExternal ? "ai-badge--advisory" : "ai-badge--grounded"
                    }`}
                  >
                    {isExternal ? "Nguồn ngoài đã duyệt" : "Nội bộ"}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{item.title}</p>
                {item.subtitle ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.subtitle}</p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>

                {isExternal ? (
                  <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                    {item.source_name ? <p>Nguồn: {item.source_name}</p> : null}
                    {item.provenance_note ? <p>{item.provenance_note}</p> : null}
                  </div>
                ) : null}

                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
                  {item.cta_label}
                  <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <AiSurfaceState
          state="no-data"
          title="Chưa có tài liệu tham khảo phù hợp"
          description="Hiện chưa có nguồn nội bộ hoặc nguồn ngoài đã duyệt đủ mạnh để gợi ý."
        />
      )}
    </div>
  );
}

function LessonPitfallsSection({
  data,
  onContinueInChat,
}: {
  data: LessonStudyResponse;
  onContinueInChat: (prompt: string) => void;
}) {
  if (data.common_pitfalls.length === 0 && data.likely_misunderstandings.length === 0) {
    return (
      <AiSurfaceState
        state="no-data"
        title="Chưa có điểm dễ nhầm nổi bật"
        description="AI chưa phát hiện đủ tín hiệu để liệt kê các điểm dễ hiểu sai rõ ràng cho bài học này."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.common_pitfalls.length > 0
        ? data.common_pitfalls.map((item) => (
            <AiInsightCard
              key={`${item.misunderstanding}-${item.correction}`}
              title={item.misunderstanding}
              description={item.correction}
              icon={<Lightbulb className="size-5" />}
              trustTone="caution"
              badgeLabel="Điểm dễ nhầm"
            />
          ))
        : null}

      {data.likely_misunderstandings.length > 0 ? (
        <AiInsightCard
          title="Các nhầm lẫn thường gặp"
          description="Danh sách ngắn các điểm người học hay bỏ sót hoặc hiểu chưa đúng."
          trustTone="caution"
        >
          <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-700">
            {data.likely_misunderstandings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AiInsightCard>
      ) : null}

      <AiSurfaceState
        state="empty"
        title="Muốn đào sâu thêm một điểm dễ nhầm?"
        description="Chuyển sang chat để hỏi tiếp theo đúng bài học này, ví dụ: vì sao điểm nào dễ hiểu sai, hoặc nên đối chiếu với ví dụ nào."
        actionLabel="Tiếp tục trong chat"
        onAction={() => onContinueInChat("Giải thích kỹ hơn các điểm dễ nhầm trong bài học này.")}
      />
    </div>
  );
}

function LessonStudyPanelInner({
  data,
  loading,
  error,
  onRefresh,
  referencesData,
  referencesLoading,
  referencesError,
  referenceIntent,
  onReferenceIntentChange,
}: {
  data: LessonStudyResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  referencesData: LessonReferencesResponse | null;
  referencesLoading: boolean;
  referencesError: string | null;
  referenceIntent: LessonReferenceIntent;
  onReferenceIntentChange: (intent: LessonReferenceIntent) => void;
}) {
  const [explainMode, setExplainMode] = useState<ExplainMode>("beginner");
  const [activeTab, setActiveTab] = useState<StudyTab>("summary");
  const { openChat, pageContext } = useAiUi();
  const metadataOnly = data?.source_state === "metadata_only";
  const restrictedMode = pageContext.surface === "quiz_restricted";

  useEffect(() => {
    if (activeTab === "references") {
      trackAiEvent("lesson_reference_open", { intent: referenceIntent });
    }
  }, [activeTab, referenceIntent]);

  const openLessonChat = useCallback(
    (prefill: string) => {
      trackAiEvent("continue_in_chat", { source: "lesson_study" });
      openChat({ prefill });
    },
    [openChat]
  );

  return (
    <AiSidePanelShell
      badgeLabel="Trợ lý học bài AI"
      title="Bám theo bài học đang mở"
      description="Tóm tắt, hỏi đáp, tham khảo và các điểm dễ nhầm đều bám theo lesson body hiện tại."
      onRefresh={onRefresh}
    >
      {restrictedMode ? (
        <div className="px-4 py-4">
          <AiSurfaceState
            state="restricted"
            title="Trợ lý học bài đang tạm giới hạn"
            description="Trong lúc bạn đang làm quiz, phần phân tích sâu của bài học sẽ tạm ẩn để tránh hỗ trợ gián tiếp cho bài kiểm tra."
            actionLabel="Mở AI giới hạn"
            onAction={() => openChat()}
          />
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as StudyTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b border-slate-200/70 px-4 py-3">
            <TabsList className="w-full rounded-full bg-slate-100">
              <TabsTrigger value="summary" className="rounded-full">
                Tóm tắt
              </TabsTrigger>
              <TabsTrigger value="qa" className="rounded-full">
                Hỏi & đáp
              </TabsTrigger>
              <TabsTrigger value="references" className="rounded-full">
                Tham khảo
              </TabsTrigger>
              <TabsTrigger value="pitfalls" className="rounded-full">
                Điểm dễ nhầm
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <AiSurfaceState
                state="loading"
                title="Đang đọc bài học"
                description="AI đang tổng hợp tóm tắt, ý chính và câu hỏi tự kiểm tra."
              />
            ) : error ? (
              <AiSurfaceState
                state="error"
                title="Không thể tải trợ lý học bài"
                description={error}
                actionLabel="Thử lại"
                onAction={onRefresh}
              />
            ) : !data ? (
              <AiSurfaceState
                state="empty"
                title="Chưa có dữ liệu phân tích"
                description="Làm mới để AI đọc lại bài học hiện tại và tạo bản hỗ trợ học tập."
                actionLabel="Làm mới"
                onAction={onRefresh}
              />
            ) : metadataOnly ? (
              <StudyNoDataState
                title="Bài học chưa đủ nội dung văn bản"
                description="Lesson này chưa có đủ body text để tạo phần tóm tắt đáng tin."
              />
            ) : (
              <LessonSummarySection data={data} />
            )}
          </TabsContent>

          <TabsContent value="qa" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <AiSurfaceState
                state="loading"
                title="Đang chuẩn bị phần hỏi & đáp"
                description="AI đang tạo phiên bản giải thích cho người mới, ví dụ minh họa và ghi chú học nhanh."
              />
            ) : error ? (
              <AiSurfaceState
                state="error"
                title="Không thể tải phần hỏi & đáp"
                description={error}
                actionLabel="Thử lại"
                onAction={onRefresh}
              />
            ) : !data ? (
              <AiSurfaceState
                state="empty"
                title="Chưa có dữ liệu hỏi & đáp"
                description="Làm mới để tạo phần giải thích và khởi động chat theo đúng bài học này."
                actionLabel="Làm mới"
                onAction={onRefresh}
              />
            ) : metadataOnly ? (
              <StudyNoDataState
                title="Chưa đủ lesson body để hỏi & đáp sâu"
                description="Bài học hiện chưa có đủ nội dung văn bản để sinh phần giải thích và ví dụ đáng tin."
              />
            ) : (
              <LessonQaSection
                data={data}
                explainMode={explainMode}
                onExplainModeChange={setExplainMode}
              />
            )}
          </TabsContent>

          <TabsContent value="references" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <LessonReferencesSection
              referencesData={referencesData}
              referencesLoading={referencesLoading}
              referencesError={referencesError}
              referenceIntent={referenceIntent}
              onReferenceIntentChange={onReferenceIntentChange}
            />
          </TabsContent>

          <TabsContent value="pitfalls" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <AiSurfaceState
                state="loading"
                title="Đang tổng hợp điểm dễ nhầm"
                description="AI đang gom các nhầm lẫn thường gặp và cách chỉnh lại cho đúng."
              />
            ) : error ? (
              <AiSurfaceState
                state="error"
                title="Không thể tải điểm dễ nhầm"
                description={error}
                actionLabel="Thử lại"
                onAction={onRefresh}
              />
            ) : !data ? (
              <AiSurfaceState
                state="empty"
                title="Chưa có dữ liệu điểm dễ nhầm"
                description="Làm mới để AI xác định các điểm người học hay hiểu sai trong bài này."
                actionLabel="Làm mới"
                onAction={onRefresh}
              />
            ) : metadataOnly ? (
              <StudyNoDataState
                title="Chưa đủ lesson body để xác định điểm dễ nhầm"
                description="AI cần thêm nội dung văn bản để chỉ ra các nhầm lẫn phổ biến một cách đáng tin."
              />
            ) : (
              <LessonPitfallsSection data={data} onContinueInChat={openLessonChat} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </AiSidePanelShell>
  );
}

export function LessonStudyAssistant({
  lessonId,
  courseId,
  courseTitle,
  lessonTitle,
  currentPath,
}: {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  currentPath: string;
}) {
  const [data, setData] = useState<LessonStudyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceIntent, setReferenceIntent] = useState<LessonReferenceIntent>("foundations");
  const [referencesData, setReferencesData] = useState<LessonReferencesResponse | null>(null);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState<string | null>(null);

  const loadStudy = useCallback(async () => {
    setLoading(true);
    setError(null);
    trackAiEvent("lesson_study_refresh", { lesson_id: lessonId, current_path: currentPath });
    try {
      setData(await fetchLessonStudy(lessonId, currentPath));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể phân tích bài học này.");
    } finally {
      setLoading(false);
    }
  }, [currentPath, lessonId]);

  const loadReferences = useCallback(
    async (intent: LessonReferenceIntent) => {
      setReferencesLoading(true);
      setReferencesError(null);
      try {
        const response = await fetchLessonReferences(lessonId, intent);
        setReferencesData(response);
        if (!response.intents.includes(intent) && response.intents.length > 0) {
          setReferenceIntent(response.intents[0]);
        }
      } catch (nextError) {
        setReferencesError(nextError instanceof Error ? nextError.message : "Không thể tải tài liệu tham khảo.");
      } finally {
        setReferencesLoading(false);
      }
    },
    [lessonId]
  );

  useEffect(() => {
    void loadStudy();
  }, [loadStudy]);

  useEffect(() => {
    void loadReferences(referenceIntent);
  }, [loadReferences, referenceIntent]);

  const contextValue = useMemo(
    () => ({
      surface: "lesson_study" as const,
      title: "Trợ lý học bài AI",
      description: "Tóm tắt, hỏi đáp, tham khảo và các điểm dễ nhầm theo đúng bài học đang mở.",
      starterPrompts: [
        "Tóm tắt bài học này.",
        "Giải thích bài này cho người mới bắt đầu.",
        "Cho tôi các điểm dễ nhầm trong bài học này.",
      ],
      courseId,
      lessonId,
      courseTitle,
      lessonTitle,
      currentPath,
    }),
    [courseId, courseTitle, currentPath, lessonId, lessonTitle]
  );

  const panel = (
    <LessonStudyPanelInner
      data={data}
      loading={loading}
      error={error}
      onRefresh={loadStudy}
      referencesData={referencesData}
      referencesLoading={referencesLoading}
      referencesError={referencesError}
      referenceIntent={referenceIntent}
      onReferenceIntentChange={setReferenceIntent}
    />
  );

  return (
    <>
      <AiPageContextBridge value={contextValue} />

      <aside className="sticky top-6 hidden min-h-[720px] xl:block">{panel}</aside>

      <div className="xl:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="ai-action-primary fixed left-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 max-w-[calc(100vw-6rem)] rounded-full shadow-[0_20px_40px_-20px_rgba(15,23,42,0.5)] sm:left-5 sm:bottom-[calc(env(safe-area-inset-bottom)+1.25rem)]"
            >
              <BookOpenText className="size-4" />
              Học cùng AI
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-[85dvh] max-h-[85dvh] rounded-t-[28px] border-slate-200 bg-[#f8fbff] p-0"
          >
            <SheetHeader className="border-b border-slate-200/80 px-4 py-4 text-left">
              <SheetTitle>Trợ lý học bài AI</SheetTitle>
              <SheetDescription>{lessonTitle}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden p-4">{panel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
