"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  HelpCircle,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { apiDelete, apiFetch, apiPost } from "@/lib/api-fetch";

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

interface StudentOption {
  id: string;
  name: string;
  email: string;
}

interface LessonWithQuizzes {
  id: string | number;
  title: string;
  quizzes?: Quiz[];
}

export default function QuizListPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetQuiz, setResetQuiz] = useState<Quiz | null>(null);
  const [resetStudentId, setResetStudentId] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const loadQuizzes = async () => {
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/lessons`);

      if (!res.ok) {
        throw new Error("Failed to load lessons");
      }

      const data = await res.json();
      const lessons: LessonWithQuizzes[] = data.data ?? [];

      // Extract quizzes from lessons
      const allQuizzes: Quiz[] = [];
      for (const lesson of lessons) {
        const lessonQuizzes = lesson.quizzes ?? [];
        for (const quiz of lessonQuizzes) {
          allQuizzes.push({
            ...quiz,
            lesson_id: { id: String(lesson.id), title: lesson.title },
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

  const loadStudents = async () => {
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/students`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message = [err?.error, err?.detail].filter(Boolean).join(" | ");
        throw new Error(message || "Không thể tải danh sách học viên");
      }

      const data = await res.json();
      const list: StudentOption[] = data.data ?? [];
      setStudents(list);

      const missingUserIdCount = Number(data?.meta?.missing_user_id_count ?? 0);
      if (list.length === 0 && missingUserIdCount > 0) {
        toast.warning(
          "Có học viên đã đăng ký nhưng chưa đọc được user_id để đặt lại lượt làm quiz."
        );
      }
    } catch {
      toast.error("Không thể tải danh sách học viên");
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setIsLoadingStudents(true);
    loadQuizzes();
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleDelete = async (quizId: string) => {
    setDeletingId(quizId);
    try {
      const res = await apiDelete(`/api/instructor/quizzes/${quizId}`);

      if (!res.ok) throw new Error("Không thể xóa quiz");

      toast.success("Đã xóa quiz!");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa quiz");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenResetDialog = (quiz: Quiz) => {
    setResetQuiz(quiz);
    setResetStudentId("");
  };

  const handleCloseResetDialog = () => {
    if (isResetting) return;
    setResetQuiz(null);
    setResetStudentId("");
  };

  const handleResetAttempts = async () => {
    if (!resetQuiz || !resetStudentId) {
      toast.error("Vui lòng chọn học viên");
      return;
    }

    setIsResetting(true);
    try {
      const res = await apiPost(
        `/api/instructor/courses/${courseId}/quizzes/${resetQuiz.id}/reset-attempts`,
        { user_id: resetStudentId }
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message = [data?.error, data?.detail].filter(Boolean).join(" | ");
        throw new Error(message || "Không thể đặt lại lượt làm quiz");
      }

      toast.success(data?.message || "Đã đặt lại lượt làm quiz");
      setResetQuiz(null);
      setResetStudentId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đặt lại lượt làm quiz"
      );
    } finally {
      setIsResetting(false);
    }
  };

  const getLessonTitle = (quiz: Quiz): string => {
    if (!quiz.lesson_id) return "Chưa gắn bài học";
    if (typeof quiz.lesson_id === "object") return quiz.lesson_id.title;
    return `Bài học #${quiz.lesson_id}`;
  };

  const selectedStudent = students.find((student) => student.id === resetStudentId);

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
            <h1 className="text-2xl font-bold tracking-tight">Quản lý quiz</h1>
            <p className="text-muted-foreground">{quizzes.length} quiz trong khóa học</p>
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
            <Link href={`/instructor/courses/${courseId}/quizzes/new`} className="mt-4">
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
                    <CardDescription className="mt-1">{getLessonTitle(quiz)}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/instructor/courses/${courseId}/quizzes/${quiz.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1.5 size-3.5" />
                        Sửa
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenResetDialog(quiz)}
                      disabled={isLoadingStudents || students.length === 0}
                    >
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Đặt lại lượt
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={deletingId === quiz.id}
                        >
                          <Trash2 className="mr-1.5 size-3.5" />
                          Xóa
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa quiz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc muốn xóa quiz &ldquo;{quiz.title}&rdquo;? Tất cả câu hỏi và
                            câu trả lời sẽ bị xóa vĩnh viễn.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(quiz.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary">{quiz.questions?.length ?? 0} câu hỏi</Badge>
                  <Badge variant="outline">Điểm đạt: {quiz.passing_score}%</Badge>
                  {quiz.time_limit > 0 && <Badge variant="outline">{quiz.time_limit} phút</Badge>}
                  <Badge variant="outline">Tối đa {quiz.max_attempts} lần thử</Badge>
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

      <Dialog
        open={Boolean(resetQuiz)}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseResetDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lại lượt làm quiz</DialogTitle>
            <DialogDescription>
              Xóa toàn bộ lượt làm của một học viên cho quiz <span className="font-medium">{resetQuiz?.title}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reset-student">Học viên</Label>
            <Select
              value={resetStudentId}
              onValueChange={setResetStudentId}
              disabled={isLoadingStudents || students.length === 0 || isResetting}
            >
              <SelectTrigger id="reset-student">
                <SelectValue
                  placeholder={
                    isLoadingStudents
                      ? "Đang tải học viên..."
                      : students.length === 0
                        ? "Chưa có học viên"
                        : "Chọn học viên cần đặt lại lượt"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                    {student.email ? ` - ${student.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStudent && (
              <p className="text-xs text-muted-foreground">
                Sẽ đặt lại tất cả lượt làm quiz của {selectedStudent.name}.
              </p>
            )}
            {!isLoadingStudents && students.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Khóa học chưa có học viên đăng ký.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseResetDialog}>
              Hủy
            </Button>
            <Button
              onClick={handleResetAttempts}
              disabled={
                isResetting ||
                isLoadingStudents ||
                students.length === 0 ||
                !resetStudentId
              }
            >
              {isResetting ? "Đang đặt lại..." : "Xác nhận đặt lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
