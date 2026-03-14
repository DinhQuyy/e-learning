"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trophy,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/api-fetch";
import type { AssignmentResponse } from "@/lib/ai-schemas";
import type { Quiz, QuizQuestion, QuizAnswer, QuizAttempt } from "@/types";

interface QuizPlayerProps {
  quiz: Quiz;
  context?: {
    courseId: string;
    lessonId?: string;
  };
  onComplete?: (result: QuizResult) => void;
}

interface QuizResult {
  score: number;
  is_passed: boolean;
  total_points: number;
  earned_points: number;
  results_per_question: QuestionResult[];
}

interface QuestionResult {
  question_id: string;
  question_text: string;
  is_correct: boolean;
  earned_points: number;
  max_points: number;
  explanation: string | null;
  correct_answer_ids: string[];
  selected_answer_ids: string[];
}

type AnswerMap = Record<string, string[]>;
type HintMeta = {
  conversationId: string | null;
  assistantMessageId: string | null;
};

const normalizeAnswers = (answers: unknown): AnswerMap => {
  if (!answers || typeof answers !== "object") return {};
  const normalized: AnswerMap = {};
  Object.entries(answers as Record<string, unknown>).forEach(([qId, value]) => {
    if (Array.isArray(value)) {
      normalized[qId] = value.map((v) => String(v));
    } else if (typeof value === "string" || typeof value === "number") {
      normalized[qId] = [String(value)];
    }
  });
  return normalized;
};

const computeResult = (quiz: Quiz, answers: AnswerMap): QuizResult => {
  const questions = quiz.questions || [];
  let totalPoints = 0;
  let earnedPoints = 0;
  const resultsPerQuestion = questions
    .sort((a, b) => a.sort - b.sort)
    .map((question) => {
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;

      const selectedAnswerIds = answers[String(question.id)] || [];
      const correctAnswerIds = (question.answers || [])
        .filter((a) => a.is_correct)
        .map((a) => String(a.id));

      const isCorrect =
        selectedAnswerIds.length === correctAnswerIds.length &&
        selectedAnswerIds.every((id) => correctAnswerIds.includes(id)) &&
        correctAnswerIds.every((id) => selectedAnswerIds.includes(id));

      if (isCorrect) {
        earnedPoints += questionPoints;
      }

      return {
        question_id: String(question.id),
        question_text: question.question_text,
        is_correct: isCorrect,
        earned_points: isCorrect ? questionPoints : 0,
        max_points: questionPoints,
        explanation: question.explanation,
        correct_answer_ids: correctAnswerIds,
        selected_answer_ids: selectedAnswerIds,
      };
    });

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    is_passed: score >= (quiz.passing_score ?? 70),
    total_points: totalPoints,
    earned_points: earnedPoints,
    results_per_question: resultsPerQuestion,
  };
};

export function QuizPlayer({ quiz, context, onComplete }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [bestResult, setBestResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.time_limit ? quiz.time_limit * 60 : null
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [hintByQuestion, setHintByQuestion] = useState<
    Record<string, AssignmentResponse | null>
  >({});
  const [hintMetaByQuestion, setHintMetaByQuestion] = useState<Record<string, HintMeta>>({});
  const [hintFeedbackByQuestion, setHintFeedbackByQuestion] = useState<
    Record<string, 1 | -1 | null>
  >({});
  const [hintFeedbackLoadingByQuestion, setHintFeedbackLoadingByQuestion] = useState<
    Record<string, boolean>
  >({});
  const [hintLoadingQuestionId, setHintLoadingQuestionId] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    quiz.max_attempts > 0 ? quiz.max_attempts : null
  );
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = quiz.questions || [];
  const isOutOfAttempts =
    attemptsRemaining !== null && attemptsRemaining <= 0;

  // Timer
  useEffect(() => {
    if (!hasStarted || timeLeft === null || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, result]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: string, answerId: string, questionType: string) => {
    setAnswers((prev) => {
      const key = String(questionId);
      if (questionType === "single_choice" || questionType === "true_false") {
        return { ...prev, [key]: [answerId] };
      }
      // multiple_choice
      const current = prev[key] || [];
      if (current.includes(answerId)) {
        return { ...prev, [key]: current.filter((id) => id !== answerId) };
      }
      return { ...prev, [key]: [...current, answerId] };
    });
  };

  const requestHint = useCallback(
    async (question: QuizQuestion) => {
      if (!context?.courseId) {
        setHintError("Thiếu course context cho Assignment Mode.");
        return;
      }

      const selectedIds = answers[String(question.id)] || [];
      const studentAttempt = selectedIds.join(", ");

      setHintError(null);
      setHintLoadingQuestionId(String(question.id));

      try {
        const res = await apiPost("/api/ai/assignment", {
          course_id: context.courseId,
          lesson_id: context.lessonId ?? null,
          quiz_id: quiz.id,
          question: question.question_text,
          student_attempt: studentAttempt,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Không thể lấy gợi ý");
        }

        const payload = await res.json();
        const aiData = payload?.data as AssignmentResponse;
        const questionKey = String(question.id);

        setHintByQuestion((prev) => ({
          ...prev,
          [questionKey]: aiData,
        }));
        setHintMetaByQuestion((prev) => ({
          ...prev,
          [questionKey]: {
            conversationId:
              typeof payload?.meta?.conversation_id === "string"
                ? payload.meta.conversation_id
                : null,
            assistantMessageId:
              typeof payload?.meta?.assistant_message_id === "string"
                ? payload.meta.assistant_message_id
                : null,
          },
        }));
        setHintFeedbackByQuestion((prev) => ({
          ...prev,
          [questionKey]: null,
        }));
      } catch (err) {
        setHintError(err instanceof Error ? err.message : "Lỗi không xác định");
      } finally {
        setHintLoadingQuestionId(null);
      }
    },
    [answers, context?.courseId, context?.lessonId, quiz.id]
  );

  const submitHintFeedback = useCallback(
    async (questionId: string, rating: 1 | -1) => {
      const meta = hintMetaByQuestion[questionId];
      if (!meta?.conversationId || !meta?.assistantMessageId) {
        return;
      }

      setHintFeedbackLoadingByQuestion((prev) => ({
        ...prev,
        [questionId]: true,
      }));

      try {
        const res = await apiPost("/api/ai/feedback", {
          conversation_id: meta.conversationId,
          assistant_message_id: meta.assistantMessageId,
          mode: "assignment",
          rating,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Không thể gửi feedback");
        }

        setHintFeedbackByQuestion((prev) => ({
          ...prev,
          [questionId]: rating,
        }));
      } catch (err) {
        setHintError(err instanceof Error ? err.message : "Gui feedback that bai");
      } finally {
        setHintFeedbackLoadingByQuestion((prev) => ({
          ...prev,
          [questionId]: false,
        }));
      }
    },
    [hintMetaByQuestion]
  );

  const handleSubmit = useCallback(async () => {
    if (isOutOfAttempts) {
      toast.error("Bạn đã hết lượt làm bài kiểm tra này");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await apiPost(`/api/quizzes/${quiz.id}/submit`, { answers });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Lỗi nộp bài");
      }

      const data = await res.json();
      const quizResult: QuizResult = data.data;
      const newBest =
        !bestResult || quizResult.score > bestResult.score
          ? quizResult
          : bestResult;
      setBestResult(newBest);
      setResult(newBest);

      if (timerRef.current) clearInterval(timerRef.current);

      if (quizResult.is_passed) {
        toast.success("Chúc mừng! Bạn đã đạt bài kiểm tra.");
      } else {
        toast.error("Bạn chưa đạt. Hãy thử lại!");
      }

      onComplete?.(quizResult);

      // Update attempts state & remaining attempts
      const attemptRecord = data.data?.attempt;
      if (attemptRecord) {
        setAttempts((prev) => [attemptRecord, ...prev]);
        if (quiz.max_attempts > 0) {
          setAttemptsRemaining((prev) =>
            prev === null
              ? null
              : Math.max(quiz.max_attempts - (attempts.length + 1), 0)
          );
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi nộp bài");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, quiz, isSubmitting, onComplete, attempts.length, isOutOfAttempts, bestResult]);

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
    setTimeLeft(quiz.time_limit ? quiz.time_limit * 60 : null);
    setHasStarted(false);
  };

  // Load previous attempts to enforce limits and restore last result
  useEffect(() => {
    let mounted = true;
    const loadAttempts = async () => {
      setIsLoadingAttempts(true);
      try {
        const res = await apiFetch(`/api/quizzes/${quiz.id}/attempts`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const list: QuizAttempt[] = data.data ?? [];
        setAttempts(list);
        if (quiz.max_attempts > 0) {
          setAttemptsRemaining(Math.max(quiz.max_attempts - list.length, 0));
        }
        // Prefer the highest score among attempts (fallback to recalculation)
        const bestAttempt = list.reduce<QuizAttempt | null>((best, attempt) => {
          const currentScore = Number(attempt.score ?? 0);
          const bestScore = Number(best?.score ?? -1);
          if (!best || currentScore > bestScore) return attempt;
          return best;
        }, null);

        if (bestAttempt) {
          const restoredBest = computeResult(
            quiz,
            normalizeAnswers(bestAttempt.answers)
          );
          setBestResult(restoredBest);
          setResult(restoredBest);
          setHasStarted(false);
        }
      } finally {
        if (mounted) setIsLoadingAttempts(false);
      }
    };

    loadAttempts();
    return () => {
      mounted = false;
    };
  }, [quiz]);

  const attemptsInfo = (() => {
    if (quiz.max_attempts <= 0) return null;
    const used = attempts.length;
    const remaining =
      attemptsRemaining !== null
        ? attemptsRemaining
        : Math.max(quiz.max_attempts - used, 0);
    return { used, remaining, total: quiz.max_attempts };
  })();

  // Start quiz screen
  if (!hasStarted && !result) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-semibold">{quiz.title}</h3>
        {quiz.description && (
          <p className="text-sm text-muted-foreground">{quiz.description}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{questions.length} câu hỏi</span>
          {quiz.time_limit && (
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {quiz.time_limit} phút
            </span>
          )}
          <span>Điểm đạt: {quiz.passing_score}%</span>
          {quiz.max_attempts > 0 && (
            <span>
              Lượt: {attemptsInfo?.used ?? 0}/{quiz.max_attempts}{" "}
              {attemptsRemaining !== null && attemptsRemaining <= 0
                ? "(Hết lượt)"
                : ""}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <Button
            onClick={() => setHasStarted(true)}
            size="lg"
            disabled={isOutOfAttempts || isLoadingAttempts}
          >
            {isOutOfAttempts ? "Đã hết lượt" : "Bắt đầu làm bài kiểm tra"}
          </Button>
          {isOutOfAttempts && (
            <p className="text-xs text-destructive">
              Bạn đã dùng hết lượt làm bài kiểm tra này.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Results view
  if (result) {
    return (
      <div className="space-y-6">
        {/* Score Summary */}
        <div className="text-center space-y-3">
          <div
            className={`inline-flex size-16 items-center justify-center rounded-full ${
              result.is_passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            }`}
          >
            {result.is_passed ? (
              <Trophy className="size-8" />
            ) : (
              <AlertCircle className="size-8" />
            )}
          </div>
          <h3 className="text-xl font-bold">
            {result.is_passed ? "Chúc mừng! Bạn đã đạt!" : "Chưa đạt"}
          </h3>
          <div className="text-3xl font-bold">{result.score}%</div>
          <p className="text-sm text-muted-foreground">
            {result.earned_points}/{result.total_points} điểm (Cần đạt:{" "}
            {quiz.passing_score}%)
          </p>
          <p className="text-xs text-muted-foreground">
            Điểm cao nhất: {bestResult?.score ?? result.score}%
          </p>
          {attemptsInfo && (
            <p className="text-xs text-muted-foreground">
              Lượt đã làm: {attemptsInfo.used}/{attemptsInfo.total} | Còn lại:{" "}
              {Math.max(attemptsInfo.remaining, 0)}
            </p>
          )}
        </div>

        {/* Per-question Results */}
        <div className="space-y-4">
          {result.results_per_question.map((qResult, idx) => (
            <Card
              key={qResult.question_id}
              className={
                qResult.is_correct
                  ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                  : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
              }
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {qResult.is_correct ? (
                    <CheckCircle className="mt-0.5 size-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 text-red-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      Câu {idx + 1}: {qResult.question_text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {qResult.earned_points}/{qResult.max_points} điểm
                    </p>
                  </div>
                </div>
                {qResult.explanation && (
                  <div className="ml-7 rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Giải thích:</strong> {qResult.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Retry Button */}
        {!isOutOfAttempts && (
          <div className="text-center">
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RotateCcw className="size-4" />
              Làm lại
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Quiz questions view
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Timer and progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {answeredCount}/{questions.length} câu đã trả lời
          </span>
          {attemptsInfo && (
            <Badge variant="outline" className="text-xs">
              Còn {Math.max(attemptsInfo.remaining, 0)} / {attemptsInfo.total} lượt
            </Badge>
          )}
        </div>
        {timeLeft !== null && (
          <Badge
            variant={timeLeft < 60 ? "destructive" : "secondary"}
            className="gap-1"
          >
            <Clock className="size-3" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>
      <Progress value={progressPercent} />
      {hintError ? (
        <p className="text-xs text-red-600">{hintError}</p>
      ) : null}

      {/* Questions */}
      <div className="space-y-6">
        {questions
          .sort((a: QuizQuestion, b: QuizQuestion) => a.sort - b.sort)
          .map((question: QuizQuestion, idx: number) => {
            const questionAnswers = (question.answers || []).sort(
              (a: QuizAnswer, b: QuizAnswer) => a.sort - b.sort
            );
            const questionKey = String(question.id);
            const selectedIds = answers[questionKey] || [];
            const hintData = hintByQuestion[questionKey];
            const hintMeta = hintMetaByQuestion[questionKey];
            const hintFeedback = hintFeedbackByQuestion[questionKey] ?? null;
            const hintFeedbackLoading = Boolean(hintFeedbackLoadingByQuestion[questionKey]);

            return (
              <Card key={question.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    <span className="text-muted-foreground mr-2">
                      Câu {idx + 1}.
                    </span>
                    {question.question_text}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {question.question_type === "multiple_choice"
                        ? "Chọn nhiều"
                        : "Đúng/Sai"}
                    </Badge>
                    <span>{question.points} điểm</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questionAnswers.map((answer: QuizAnswer) => {
                    const isSelected = selectedIds.includes(answer.id);
                    const isMultiple = question.question_type === "multiple_choice";

                    return (
                      <div
                        key={answer.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          handleAnswerSelect(
                            question.id,
                            answer.id,
                            question.question_type
                          )
                        }
                      >
                        {isMultiple ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleAnswerSelect(
                                question.id,
                                answer.id,
                                question.question_type
                              )
                            }
                          />
                        ) : (
                          <div
                            className={`size-4 rounded-full border-2 shrink-0 ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && (
                              <div className="size-full rounded-full border-2 border-background" />
                            )}
                          </div>
                        )}
                        <Label className="flex-1 cursor-pointer text-sm font-normal">
                          {answer.answer_text}
                        </Label>
                      </div>
                    );
                  })}

                  <div className="mt-2 rounded-lg border border-dashed p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Assignment Mode
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => requestHint(question)}
                        disabled={!context?.courseId || hintLoadingQuestionId === questionKey}
                      >
                        {hintLoadingQuestionId === questionKey ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Xin goi y"
                        )}
                      </Button>
                    </div>

                    {hintData ? (
                      <div className="space-y-2">
                        {hintData.blocked ? (
                          <p className="text-xs text-amber-700">
                            {hintData.block_reason}
                          </p>
                        ) : null}
                        {(hintData.hints ?? []).map((hint, hintIndex) => (
                          <div key={`${question.id}-hint-${hintIndex}`} className="rounded border bg-muted/40 p-2">
                            <p className="text-xs font-medium">{hint.hint}</p>
                            <p className="text-xs text-muted-foreground">{hint.why}</p>
                          </div>
                        ))}
                        {(hintData.self_check ?? []).length > 0 ? (
                          <div className="rounded border bg-background p-2">
                            <p className="text-[11px] font-semibold text-muted-foreground">Tu kiem tra</p>
                            {(hintData.self_check ?? []).map((item, itemIndex) => (
                              <p key={`${question.id}-check-${itemIndex}`} className="text-xs text-muted-foreground">
                                - {item}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        {hintMeta?.conversationId && hintMeta?.assistantMessageId ? (
                          <div className="rounded border bg-background p-2">
                            <p className="mb-2 text-[11px] text-muted-foreground">
                              Danh gia goi y nay de AI hoc chat rieng cua ban
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={hintFeedback === 1 ? "default" : "outline"}
                                onClick={() => submitHintFeedback(questionKey, 1)}
                                disabled={hintFeedbackLoading}
                                className="gap-1"
                              >
                                <ThumbsUp className="size-3.5" />
                                Huu ich
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={hintFeedback === -1 ? "destructive" : "outline"}
                                onClick={() => submitHintFeedback(questionKey, -1)}
                                disabled={hintFeedbackLoading}
                                className="gap-1"
                              >
                                <ThumbsDown className="size-3.5" />
                                Chua huu ich
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        AI se chi tra goi y, khong tra dap an hoan chinh.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || answeredCount === 0 || isOutOfAttempts}
          size="lg"
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Nộp bài ({answeredCount}/{questions.length})
        </Button>
      </div>
    </div>
  );
}
