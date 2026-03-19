import { NextRequest, NextResponse } from "next/server";

import { directusFetch } from "@/lib/directus-fetch";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const quizPayload = {
      title: body.title,
      description: body.description || null,
      lesson_id: body.lesson_id,
      passing_score: body.passing_score ?? 70,
      time_limit: body.time_limit || null,
      max_attempts: body.max_attempts ?? 3,
    };

    const quizRes = await directusFetch("/items/quizzes", {
      method: "POST",
      body: JSON.stringify(quizPayload),
    });

    if (quizRes.status === 401) {
      return NextResponse.json({ error: "Chưa xác thực." }, { status: 401 });
    }

    if (!quizRes.ok) {
      const errorData = await quizRes.json().catch(() => null);
      const message = errorData?.errors?.[0]?.message || "Không thể tạo quiz.";
      return NextResponse.json({ error: message }, { status: quizRes.status });
    }

    const quizData = await quizRes.json();
    const quiz = quizData.data;

    const questions = body.questions ?? [];
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];

      const questionRes = await directusFetch("/items/quiz_questions", {
        method: "POST",
        body: JSON.stringify({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type || "single_choice",
          explanation: q.explanation || null,
          sort: qi + 1,
          points: q.points ?? 1,
        }),
      });

      if (!questionRes.ok) continue;

      const questionData = await questionRes.json();
      const question = questionData.data;

      const answers = q.answers ?? [];
      for (let ai = 0; ai < answers.length; ai++) {
        const a = answers[ai];
        await directusFetch("/items/quiz_answers", {
          method: "POST",
          body: JSON.stringify({
            question_id: question.id,
            answer_text: a.answer_text,
            is_correct: a.is_correct ?? false,
            sort: ai + 1,
          }),
        });
      }
    }

    return NextResponse.json({ data: quiz }, { status: 201 });
  } catch (error) {
    console.error("POST quiz error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
  }
}
