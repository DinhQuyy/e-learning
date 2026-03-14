import { NextRequest, NextResponse } from "next/server";

import { enqueueDeleteIndex, enqueueQuizIndex } from "@/lib/ai-indexing";
import { directusFetch } from "@/lib/directus-fetch";

async function buildQuizIndexContent(quizId: string): Promise<{ title: string; content: string; courseId: string | null } | null> {
  const res = await directusFetch(
    `/items/quizzes/${quizId}?fields=title,description,lesson_id.module_id.course_id.id,lesson_id.module_id.course_id,questions.question_text,questions.explanation`
  );
  if (!res.ok) return null;

  const payload = await res.json().catch(() => null);
  const quiz = payload?.data;
  if (!quiz) return null;

  const courseId =
    quiz?.lesson_id?.module_id?.course_id?.id ??
    quiz?.lesson_id?.module_id?.course_id ??
    null;

  const lines: string[] = [String(quiz?.title ?? "Quiz"), String(quiz?.description ?? "")];
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];

  for (const q of questions) {
    lines.push(String(q?.question_text ?? ""));
    lines.push(String(q?.explanation ?? ""));
  }

  return {
    title: String(quiz?.title ?? "Quiz"),
    content: lines.join("\n"),
    courseId: courseId ? String(courseId) : null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const res = await directusFetch(
      `/items/quizzes/${id}?fields=*,questions.id,questions.question_text,questions.question_type,questions.explanation,questions.sort,questions.points,questions.answers.id,questions.answers.answer_text,questions.answers.is_correct,questions.answers.sort`
    );

    if (res.status === 401) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Không tìm thấy quiz." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    console.error("GET quiz error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const quizPayload: Record<string, unknown> = {};
    if (body.title !== undefined) quizPayload.title = body.title;
    if (body.description !== undefined) quizPayload.description = body.description || null;
    if (body.passing_score !== undefined) quizPayload.passing_score = body.passing_score;
    if (body.time_limit !== undefined) quizPayload.time_limit = body.time_limit || null;
    if (body.max_attempts !== undefined) quizPayload.max_attempts = body.max_attempts;
    if (body.lesson_id !== undefined) quizPayload.lesson_id = body.lesson_id;

    if (Object.keys(quizPayload).length > 0) {
      const quizRes = await directusFetch(`/items/quizzes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(quizPayload),
      });

      if (quizRes.status === 401) {
        return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
      }

      if (!quizRes.ok) {
        const errorData = await quizRes.json().catch(() => null);
        const message = errorData?.errors?.[0]?.message || "Không thể cập nhật quiz.";
        return NextResponse.json({ error: message }, { status: quizRes.status });
      }
    }

    if (body.questions !== undefined) {
      const existingQuestionsRes = await directusFetch(
        `/items/quiz_questions?filter[quiz_id][_eq]=${id}&fields=id,answers.id`
      );

      if (Object.keys(quizPayload).length === 0 && existingQuestionsRes.status === 401) {
        return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
      }

      if (existingQuestionsRes.ok) {
        const existingQuestionsData = await existingQuestionsRes.json();
        for (const question of existingQuestionsData.data ?? []) {
          for (const answer of question.answers ?? []) {
            await directusFetch(`/items/quiz_answers/${answer.id}`, {
              method: "DELETE",
            });
          }
          await directusFetch(`/items/quiz_questions/${question.id}`, {
            method: "DELETE",
          });
        }
      }

      const questions = body.questions ?? [];
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        const questionRes = await directusFetch("/items/quiz_questions", {
          method: "POST",
          body: JSON.stringify({
            quiz_id: id,
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
    }

    const indexData = await buildQuizIndexContent(id);
    if (indexData) {
      await enqueueQuizIndex({
        quizId: id,
        title: indexData.title,
        content: indexData.content,
        courseId: indexData.courseId,
      });
    }

    return NextResponse.json({ message: "Da cap nhat quiz thanh cong." });
  } catch (error) {
    console.error("PATCH quiz error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const questionsRes = await directusFetch(
      `/items/quiz_questions?filter[quiz_id][_eq]=${id}&fields=id,answers.id`
    );

    if (questionsRes.status === 401) {
      return NextResponse.json({ error: "Chua xac thuc." }, { status: 401 });
    }

    if (questionsRes.ok) {
      const questionsData = await questionsRes.json();
      for (const question of questionsData.data ?? []) {
        for (const answer of question.answers ?? []) {
          await directusFetch(`/items/quiz_answers/${answer.id}`, {
            method: "DELETE",
          });
        }
        await directusFetch(`/items/quiz_questions/${question.id}`, {
          method: "DELETE",
        });
      }
    }

    const res = await directusFetch(`/items/quizzes/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Không thể xoá quiz." }, { status: res.status });
    }

    await enqueueDeleteIndex("quiz", id);

    return NextResponse.json({ message: "Da xoa quiz thanh cong." });
  } catch (error) {
    console.error("DELETE quiz error:", error);
    return NextResponse.json({ error: "Loi he thong." }, { status: 500 });
  }
}