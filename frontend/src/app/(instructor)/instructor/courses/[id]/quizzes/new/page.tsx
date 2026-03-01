"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { apiFetch, apiPost } from "@/lib/api-fetch";

const answerSchema = z.object({
  answer_text: z.string().min(1, "Nội dung đáp án không được trống"),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  question_text: z.string().min(1, "Nội dung câu hỏi không được trống"),
  question_type: z.string(),
  explanation: z.string().optional(),
  points: z.number().min(1, "Điểm phải lớn hơn 0"),
  answers: z.array(answerSchema).min(2, "Mỗi câu hỏi phải có ít nhất 2 đáp án"),
});

const quizSchema = z.object({
  title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự"),
  description: z.string().optional(),
  lesson_id: z.string().min(1, "Vui lòng chọn bài học"),
  passing_score: z.number().min(0).max(100),
  time_limit: z.number().min(0).optional(),
  max_attempts: z.number().min(1),
  questions: z.array(questionSchema).min(1, "Phải có ít nhất 1 câu hỏi"),
});

type FormData = z.infer<typeof quizSchema>;

const questionTypes = [
  { value: "single_choice", label: "Chọn một đáp án" },
  { value: "multiple_choice", label: "Chọn nhiều đáp án" },
  { value: "true_false", label: "Đúng/Sai" },
];

interface LessonOption {
  id: number;
  title: string;
  moduleTitle: string;
}

export default function NewQuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const defaultLessonId = searchParams.get("lesson") || "";

  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      lesson_id: defaultLessonId,
      passing_score: 70,
      time_limit: 0,
      max_attempts: 3,
      questions: [
        {
          question_text: "",
          question_type: "single_choice",
          explanation: "",
          points: 1,
          answers: [
            { answer_text: "", is_correct: true },
            { answer_text: "", is_correct: false },
          ],
        },
      ],
    },
  });

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const questionsField = useFieldArray({
    control,
    name: "questions",
  });

  useEffect(() => {
    // Load modules and flatten lessons
    apiFetch(`/api/instructor/courses/${courseId}/modules`)
      .then((r) => r.json())
      .then((d) => {
        const allLessons: LessonOption[] = [];
        for (const mod of d.data ?? []) {
          for (const lesson of mod.lessons ?? []) {
            allLessons.push({
              id: lesson.id,
              title: lesson.title,
              moduleTitle: mod.title,
            });
          }
        }
        setLessons(allLessons);
      })
      .catch(() => setLessons([]));
  }, [courseId]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        lesson_id: data.lesson_id,
        passing_score: data.passing_score,
        time_limit: data.time_limit && data.time_limit > 0 ? data.time_limit : null,
        max_attempts: data.max_attempts,
        questions: data.questions.map((q) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          explanation: q.explanation || null,
          points: q.points,
          answers: q.answers.map((a) => ({
            answer_text: a.answer_text,
            is_correct: a.is_correct,
          })),
        })),
      };

      const res = await apiPost("/api/instructor/quizzes", payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Không thể tạo quiz");
      }

      toast.success("Đã tạo quiz thành công!");
      router.push(`/instructor/courses/${courseId}/quizzes`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo quiz"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    questionsField.append({
      question_text: "",
      question_type: "single_choice",
      explanation: "",
      points: 1,
      answers: [
        { answer_text: "", is_correct: true },
        { answer_text: "", is_correct: false },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/instructor/courses/${courseId}/modules`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tạo Quiz mới
          </h1>
          <p className="text-muted-foreground">
            Thêm câu hỏi và đáp án cho quiz
          </p>
        </div>
      </div>

      {/* Quiz Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Quiz</CardTitle>
          <CardDescription>Cài đặt cơ bản cho quiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề quiz *</Label>
            <Input
              id="title"
              placeholder="VD: Kiểm tra kiến thức Chương 1"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Mô tả ngắn về quiz..."
              rows={2}
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Bài học liên kết *</Label>
            <Select
              value={watch("lesson_id")}
              onValueChange={(val) => setValue("lesson_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn bài học" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={String(lesson.id)}>
                    {lesson.moduleTitle} - {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lesson_id && (
              <p className="text-sm text-destructive">
                {errors.lesson_id.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="passing_score">Điểm đạt (0-100)</Label>
              <Input
                id="passing_score"
                type="number"
                min={0}
                max={100}
                {...register("passing_score", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_limit">
                Giới hạn thời gian (phút, 0 = không giới hạn)
              </Label>
              <Input
                id="time_limit"
                type="number"
                min={0}
                {...register("time_limit", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_attempts">Số lần thử tối đa</Label>
              <Input
                id="max_attempts"
                type="number"
                min={1}
                {...register("max_attempts", { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Câu hỏi</h2>
          <Button type="button" onClick={addQuestion}>
            <Plus className="mr-2 size-4" />
            Thêm câu hỏi
          </Button>
        </div>

        {errors.questions && typeof errors.questions.message === "string" && (
          <p className="text-sm text-destructive">
            {errors.questions.message}
          </p>
        )}

        {questionsField.fields.map((field, qIndex) => (
          <QuestionCard
            key={field.id}
            index={qIndex}
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            onRemove={() => questionsField.remove(qIndex)}
            canRemove={questionsField.fields.length > 1}
          />
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Lưu Quiz
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  control,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  canRemove,
}: {
  index: number;
  control: ReturnType<typeof useForm<FormData>>["control"];
  register: ReturnType<typeof useForm<FormData>>["register"];
  watch: ReturnType<typeof useForm<FormData>>["watch"];
  setValue: ReturnType<typeof useForm<FormData>>["setValue"];
  errors: ReturnType<typeof useForm<FormData>>["formState"]["errors"];
  onRemove: () => void;
  canRemove: boolean;
}) {
  const answersField = useFieldArray({
    control,
    name: `questions.${index}.answers`,
  });

  const questionErrors = errors.questions?.[index];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="size-4" />
            Câu hỏi {index + 1}
          </CardTitle>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nội dung câu hỏi *</Label>
          <Textarea
            placeholder="Nhập câu hỏi..."
            rows={2}
            {...register(`questions.${index}.question_text`)}
          />
          {questionErrors?.question_text && (
            <p className="text-sm text-destructive">
              {questionErrors.question_text.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Loại câu hỏi</Label>
            <Select
              value={watch(`questions.${index}.question_type`)}
              onValueChange={(val) =>
                setValue(`questions.${index}.question_type`, val)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Điểm</Label>
            <Input
              type="number"
              min={1}
              {...register(`questions.${index}.points`, {
                valueAsNumber: true,
              })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Giải thích (hiện sau khi trả lời)</Label>
          <Textarea
            placeholder="Giải thích đáp án đúng..."
            rows={2}
            {...register(`questions.${index}.explanation`)}
          />
        </div>

        <Separator />

        {/* Answers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Đáp án</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                answersField.append({ answer_text: "", is_correct: false })
              }
            >
              <Plus className="mr-1 size-3.5" />
              Thêm đáp án
            </Button>
          </div>

          {questionErrors?.answers &&
            typeof questionErrors.answers.message === "string" && (
              <p className="text-sm text-destructive">
                {questionErrors.answers.message}
              </p>
            )}

          {answersField.fields.map((ansField, aIndex) => (
            <div key={ansField.id} className="flex items-center gap-2">
              <Checkbox
                checked={watch(
                  `questions.${index}.answers.${aIndex}.is_correct`
                )}
                onCheckedChange={(checked) =>
                  setValue(
                    `questions.${index}.answers.${aIndex}.is_correct`,
                    checked === true
                  )
                }
              />
              <Input
                placeholder={`Đáp án ${aIndex + 1}`}
                className="flex-1"
                {...register(
                  `questions.${index}.answers.${aIndex}.answer_text`
                )}
              />
              {answersField.fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => answersField.remove(aIndex)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Tích chọn vào ô vuông để đánh dấu đáp án đúng
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
