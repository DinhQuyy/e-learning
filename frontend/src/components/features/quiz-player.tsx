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
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiPost } from "@/lib/api-fetch";
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

export function QuizPlayer({ quiz, onComplete }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [bestResult, setBestResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.time_limit ? quiz.time_limit * 60 : null
  );
  const [hasStarted, setHasStarted] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    quiz.max_attempts > 0 ? quiz.max_attempts : null
  );
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = quiz.questions || [];
  const isOutOfAttempts = attemptsRemaining !== null && attemptsRemaining <= 0;

  useEffect(() => {
    if (!hasStarted || timeLeft === null || result) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
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

      const current = prev[key] || [];
      if (current.includes(answerId)) {
        return { ...prev, [key]: current.filter((id) => id !== answerId) };
      }
      return { ...prev, [key]: [...current, answerId] };
    });
  };

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

  if (result) {
    return (
      <div className="space-y-6">
        <div className="space-y-3 text-center">
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
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  {qResult.is_correct ? (
                    <CheckCircle className="mt-0.5 size-5 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Câu {idx + 1}: {qResult.question_text}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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

  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
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

      <div className="space-y-6">
        {questions
          .sort((a: QuizQuestion, b: QuizQuestion) => a.sort - b.sort)
          .map((question: QuizQuestion, idx: number) => {
            const questionAnswers = (question.answers || []).sort(
              (a: QuizAnswer, b: QuizAnswer) => a.sort - b.sort
            );
            const selectedIds = answers[String(question.id)] || [];

            return (
              <Card key={question.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">
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
                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        } flex items-center gap-3`}
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
                            className={`size-4 shrink-0 rounded-full border-2 ${
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
                </CardContent>
              </Card>
            );
          })}
      </div>

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
