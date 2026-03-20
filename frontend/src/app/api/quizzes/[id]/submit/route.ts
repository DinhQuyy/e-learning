import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import { QUIZ_SUBMISSION_FIELDS } from "@/lib/directus-fields";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;

    if (!quizId) {
      return NextResponse.json(
        { error: "ID quiz không hợp lệ" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { answers } = body as { answers: Record<string, string[]> };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Thiếu câu trả lời" },
        { status: 400 }
      );
    }

    // Fetch quiz with questions and correct answers
    const quizRes = await directusFetch(
      `/items/quizzes/${quizId}?fields=${QUIZ_SUBMISSION_FIELDS}`
    );

    if (quizRes.status === 401) {
      return NextResponse.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (!quizRes.ok) {
      return NextResponse.json(
        { error: "Không tìm thấy quiz" },
        { status: 404 }
      );
    }

    const quizData = await quizRes.json();
    const quiz = quizData.data;

    if (!quiz || !quiz.questions) {
      return NextResponse.json(
        { error: "Quiz không có câu hỏi" },
        { status: 400 }
      );
    }

    // Check max attempts
    if (quiz.max_attempts > 0) {
      const attemptsRes = await directusFetch(
        `/items/quiz_attempts?filter[quiz_id][_eq]=${quizId}&filter[user_id][_eq]=${userId}&aggregate[count]=id`
      );

      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const attemptCount = attemptsData.data?.[0]?.count?.id ?? 0;

        if (attemptCount >= quiz.max_attempts) {
          return NextResponse.json(
            { error: "Bạn đã hết lượt làm quiz này" },
            { status: 403 }
          );
        }
      }
    }

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    const resultsPerQuestion: Array<{
      question_id: string;
      question_text: string;
      is_correct: boolean;
      earned_points: number;
      max_points: number;
      explanation: string | null;
      correct_answer_ids: string[];
      selected_answer_ids: string[];
    }> = [];

    for (const question of quiz.questions) {
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;

      const selectedAnswerIds = answers[String(question.id)] || [];
      const correctAnswerIds = (question.answers || [])
        .filter((a: { is_correct: boolean }) => a.is_correct)
        .map((a: { id: string }) => a.id);

      // Check if the selected answers match the correct answers exactly
      const isCorrect =
        selectedAnswerIds.length === correctAnswerIds.length &&
        selectedAnswerIds.every((id: string) => correctAnswerIds.includes(id)) &&
        correctAnswerIds.every((id: string) => selectedAnswerIds.includes(id));

      if (isCorrect) {
        earnedPoints += questionPoints;
      }

      resultsPerQuestion.push({
        question_id: question.id,
        question_text: question.question_text,
        is_correct: isCorrect,
        earned_points: isCorrect ? questionPoints : 0,
        max_points: questionPoints,
        explanation: question.explanation,
        correct_answer_ids: correctAnswerIds,
        selected_answer_ids: selectedAnswerIds,
      });
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = score >= (quiz.passing_score ?? 70);
    const nowIso = new Date().toISOString();

    // Create quiz attempt record
    const attemptRes = await directusFetch("/items/quiz_attempts", {
      method: "POST",
      body: JSON.stringify({
        quiz_id: quizId,
        user_id: userId,
        score,
        passed: isPassed,
        answers,
        started_at: nowIso,
        finished_at: nowIso,
      }),
    });

    if (!attemptRes.ok) {
      const errData = await attemptRes.json();
      return NextResponse.json(
        {
          error:
            errData.errors?.[0]?.message || "Không thể lưu kết quả quiz",
        },
        { status: 500 }
      );
    }

    const attemptData = await attemptRes.json();
    return NextResponse.json({
      data: {
        attempt: attemptData.data,
        attempt_id: attemptData.data?.id ?? null,
        score,
        is_passed: isPassed,
        total_points: totalPoints,
        earned_points: earnedPoints,
        results_per_question: resultsPerQuestion,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
