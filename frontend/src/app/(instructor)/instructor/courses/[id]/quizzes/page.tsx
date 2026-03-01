"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle } from "lucide-react";
import { apiFetch, apiDelete } from "@/lib/api-fetch";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  lesson_id: string | { id: string; title: string } | null;
  passing_score: number;
  time_limit: number;
  max_attempts: number;
  questions?: { id: string }[];
}

export default function QuizListPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadQuizzes = async () => {
    try {
      const res = await apiFetch(
        `/api/instructor/courses/${courseId}/lessons`
      );

      if (!res.ok) {
        throw new Error("Failed to load lessons");
      }

      const data = await res.json();
      const lessons = data.data ?? [];

      // Extract quizzes from lessons
      const allQuizzes: Quiz[] = [];
      for (const lesson of lessons) {
        const lessonQuizzes = lesson.quizzes ?? [];
        for (const quiz of lessonQuizzes) {
          allQuizzes.push({
            ...quiz,
            lesson_id: { id: lesson.id, title: lesson.title },
          });
        }
      }
      setQuizzes(allQuizzes);
    } catch {
      toast.error("Không thể tải danh sách quiz");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleDelete = async (quizId: string) => {
    setDeletingId(quizId);
    try {
      const res = await apiDelete(`/api/instructor/quizzes/${quizId}`);

      if (!res.ok) throw new Error("Không thể xoá quiz");

      toast.success("Đã xoá quiz!");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xoá quiz"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getLessonTitle = (quiz: Quiz): string => {
    if (!quiz.lesson_id) return "Chưa gán bài học";
    if (typeof quiz.lesson_id === "object") return quiz.lesson_id.title;
    return `Bài học #${quiz.lesson_id}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}/modules`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Quản lý Quiz
            </h1>
            <p className="text-muted-foreground">
              {quizzes.length} quiz trong khoá học
            </p>
          </div>
        </div>
        <Link href={`/instructor/courses/${courseId}/quizzes/new`}>
          <Button>
            <Plus className="mr-2 size-4" />
            Tạo quiz mới
          </Button>
        </Link>
      </div>

      {/* Quiz List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">Chưa có quiz nào</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tạo quiz để kiểm tra kiến thức của học viên
            </p>
            <Link
              href={`/instructor/courses/${courseId}/quizzes/new`}
              className="mt-4"
            >
              <Button>
                <Plus className="mr-2 size-4" />
                Tạo quiz đầu tiên
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{quiz.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {getLessonTitle(quiz)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/instructor/courses/${courseId}/quizzes/${quiz.id}/edit`}
                    >
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1.5 size-3.5" />
                        Sửa
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deletingId === quiz.id}
                        >
                          <Trash2 className="mr-1.5 size-3.5" />
                          Xoá
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xoá quiz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc muốn xoá quiz &ldquo;{quiz.title}
                            &rdquo;? Tất cả câu hỏi và câu trả lời sẽ bị xoá
                            vĩnh viễn.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(quiz.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Xoá
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary">
                    {quiz.questions?.length ?? 0} câu hỏi
                  </Badge>
                  <Badge variant="outline">
                    Điểm đạt: {quiz.passing_score}%
                  </Badge>
                  {quiz.time_limit > 0 && (
                    <Badge variant="outline">
                      {quiz.time_limit} phút
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Tối đa {quiz.max_attempts} lần thử
                  </Badge>
                </div>
                {quiz.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {quiz.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
