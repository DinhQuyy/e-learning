"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Video,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Clock,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/lib/api-fetch";

interface Lesson {
  id: number;
  title: string;
  slug: string;
  sort: number;
  type: string;
  duration: number;
  status: string;
  is_free: boolean;
  quizzes?: { id: number }[];
}

interface Module {
  id: number;
  title: string;
  description: string | null;
  sort: number;
  lessons: Lesson[];
}

const lessonTypeIcons: Record<string, typeof Video> = {
  video: Video,
  text: FileText,
};

const lessonTypeLabels: Record<string, string> = {
  video: "Video",
  text: "Văn bản",
};

export default function ModulesPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Add module form
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");

  // Edit module form
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDescription, setEditModuleDescription] = useState("");

  const loadModules = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/modules`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setModules(data.data ?? []);
    } catch {
      toast.error("Không thể tải danh sách module");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề module");
      return;
    }

    setIsAddingModule(true);
    try {
      const res = await apiPost(`/api/instructor/courses/${courseId}/modules`, {
          title: newModuleTitle,
          description: newModuleDescription || null,
        });

      if (!res.ok) throw new Error("Failed to create");

      toast.success("Đã thêm module mới!");
      setNewModuleTitle("");
      setNewModuleDescription("");
      setAddDialogOpen(false);
      loadModules();
    } catch {
      toast.error("Không thể tạo module");
    } finally {
      setIsAddingModule(false);
    }
  };

  const handleEditModule = async () => {
    if (!editingModule || !editModuleTitle.trim()) return;

    try {
      const res = await apiPatch(
        `/api/instructor/courses/${courseId}/modules/${editingModule.id}`,
        {
          title: editModuleTitle,
          description: editModuleDescription || null,
        }
      );

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Đã cập nhật module!");
      setEditDialogOpen(false);
      setEditingModule(null);
      loadModules();
    } catch {
      toast.error("Không thể cập nhật module");
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!confirm("Bạn có chắc muốn xoá module này? Tất cả bài học trong module sẽ bị xoá.")) {
      return;
    }

    try {
      const res = await apiDelete(
        `/api/instructor/courses/${courseId}/modules/${moduleId}`
      );

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Đã xoá module!");
      loadModules();
    } catch {
      toast.error("Không thể xoá module");
    }
  };

  const handleMoveModule = async (
    moduleId: number,
    direction: "up" | "down"
  ) => {
    const index = modules.findIndex((m) => m.id === moduleId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === modules.length - 1)
    ) {
      return;
    }

    const newModules = [...modules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newModules[index], newModules[swapIndex]] = [
      newModules[swapIndex],
      newModules[index],
    ];

    const items = newModules.map((m, i) => ({ id: m.id, sort: i + 1 }));
    setModules(newModules);

    try {
      await apiPatch(`/api/instructor/courses/${courseId}/modules/reorder`, { items });
    } catch {
      toast.error("Không thể sắp xếp lại module");
      loadModules();
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm("Bạn có chắc muốn xoá bài học này?")) return;

    try {
      const res = await apiDelete(
        `/api/instructor/courses/${courseId}/lessons/${lessonId}`
      );

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Đã xoá bài học!");
      loadModules();
    } catch {
      toast.error("Không thể xoá bài học");
    }
  };

  const handleMoveLessonWithinModule = async (
    moduleId: number,
    lessonId: number,
    direction: "up" | "down"
  ) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
    if (
      (direction === "up" && lessonIndex === 0) ||
      (direction === "down" && lessonIndex === mod.lessons.length - 1)
    ) {
      return;
    }

    const newLessons = [...mod.lessons];
    const swapIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    [newLessons[lessonIndex], newLessons[swapIndex]] = [
      newLessons[swapIndex],
      newLessons[lessonIndex],
    ];

    // Update locally
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: newLessons } : m
      )
    );

    // Update on server
    try {
      for (let i = 0; i < newLessons.length; i++) {
        await apiPatch(
          `/api/instructor/courses/${courseId}/lessons/${newLessons[i].id}`,
          { sort: i + 1 }
        );
      }
    } catch {
      toast.error("Không thể sắp xếp lại bài học");
      loadModules();
    }
  };

  const openEditDialog = (mod: Module) => {
    setEditingModule(mod);
    setEditModuleTitle(mod.title);
    setEditModuleDescription(mod.description || "");
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instructor/courses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Quản lý nội dung khoá học
            </h1>
            <p className="text-muted-foreground">
              Thêm, sửa và sắp xếp module và bài học
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/instructor/courses/${courseId}/edit`}>
            <Button variant="outline" size="sm">
              Thông tin khoá học
            </Button>
          </Link>
          <Link href={`/instructor/courses/${courseId}/quizzes`}>
            <Button variant="outline" size="sm">
              <HelpCircle className="mr-2 size-4" />
              Quản lý Quiz
            </Button>
          </Link>

          {/* Add Module Dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Thêm module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm module mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="module-title">Tiêu đề module *</Label>
                  <Input
                    id="module-title"
                    placeholder="VD: Giới thiệu khoá học"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-desc">Mô tả (tuỳ chọn)</Label>
                  <Textarea
                    id="module-desc"
                    placeholder="Mô tả nội dung module..."
                    rows={3}
                    value={newModuleDescription}
                    onChange={(e) => setNewModuleDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Huỷ
                </Button>
                <Button onClick={handleAddModule} disabled={isAddingModule}>
                  {isAddingModule ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Thêm module
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Module Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-module-title">Tiêu đề module *</Label>
              <Input
                id="edit-module-title"
                value={editModuleTitle}
                onChange={(e) => setEditModuleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-module-desc">Mô tả (tuỳ chọn)</Label>
              <Textarea
                id="edit-module-desc"
                rows={3}
                value={editModuleDescription}
                onChange={(e) => setEditModuleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Huỷ
            </Button>
            <Button onClick={handleEditModule}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Khoá học chưa có module nào. Hãy thêm module đầu tiên.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={modules.map((m) => String(m.id))}
          className="space-y-4"
        >
          {modules.map((mod, modIndex) => (
            <AccordionItem
              key={mod.id}
              value={String(mod.id)}
              className="border rounded-lg px-4"
            >
              <div className="flex items-center gap-2">
                {/* Reorder buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveModule(mod.id, "up");
                    }}
                    disabled={modIndex === 0}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveModule(mod.id, "down");
                    }}
                    disabled={modIndex === modules.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>

                <AccordionTrigger className="flex-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Module {modIndex + 1}: {mod.title}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {mod.lessons.length} bài học
                    </Badge>
                  </div>
                </AccordionTrigger>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(mod);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModule(mod.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <AccordionContent>
                {mod.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {mod.description}
                  </p>
                )}

                {/* Lessons */}
                <div className="space-y-2 mb-4">
                  {mod.lessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Chưa có bài học nào trong module này
                    </p>
                  ) : (
                    mod.lessons.map((lesson, lessonIndex) => {
                      const LessonIcon =
                        lessonTypeIcons[lesson.type] || FileText;
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 rounded-md border px-3 py-2"
                        >
                          {/* Lesson reorder */}
                          <div className="flex flex-col">
                            <button
                              onClick={() =>
                                handleMoveLessonWithinModule(
                                  mod.id,
                                  lesson.id,
                                  "up"
                                )
                              }
                              disabled={lessonIndex === 0}
                              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleMoveLessonWithinModule(
                                  mod.id,
                                  lesson.id,
                                  "down"
                                )
                              }
                              disabled={
                                lessonIndex === mod.lessons.length - 1
                              }
                              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>

                          <LessonIcon className="size-4 text-muted-foreground shrink-0" />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {lessonTypeLabels[lesson.type] ||
                                  lesson.type}
                              </span>
                              {lesson.duration > 0 && (
                                <>
                                  <span>-</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {lesson.duration} phút
                                  </span>
                                </>
                              )}
                              {lesson.is_free && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                >
                                  <Eye className="size-2.5 mr-0.5" />
                                  Xem trước
                                </Badge>
                              )}
                            </div>
                          </div>

                          {(lesson.quizzes?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <HelpCircle className="size-3 mr-1" />
                              Quiz
                            </Badge>
                          )}

                          <Badge
                            variant={
                              lesson.status === "published"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {lesson.status === "published"
                              ? "Đã xuất bản"
                              : "Bản nháp"}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <Link
                              href={`/instructor/courses/${courseId}/quizzes/new?lesson=${lesson.id}`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Tạo quiz"
                              >
                                <HelpCircle className="size-3" />
                              </Button>
                            </Link>
                            <Link
                              href={`/instructor/courses/${courseId}/lessons/${lesson.id}/edit`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                              >
                                <Pencil className="size-3" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Lesson Button */}
                <Link
                  href={`/instructor/courses/${courseId}/lessons/new?module=${mod.id}`}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 size-3.5" />
                    Thêm bài học
                  </Button>
                </Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
