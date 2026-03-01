"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/lib/api-fetch";

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: number | null;
  sort: number | null;
  status: "published" | "draft" | "archived";
  course_count?: number;
}

const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  slug: z.string().min(1, "Slug là bắt buộc"),
  description: z.string().optional(),
  icon: z.string().optional(),
  parent_id: z.string().optional(),
  status: z.enum(["published", "draft", "archived"]),
  sort: z.number().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      icon: "",
      parent_id: "",
      status: "published",
      sort: 0,
    },
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data.data ?? []);
    } catch {
      toast.error("Không thể tải danh mục");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    if (!editingCategory) {
      form.setValue("slug", slugify(name));
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      slug: "",
      description: "",
      icon: "",
      parent_id: "",
      status: "published",
      sort: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (category: CategoryData) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon: category.icon ?? "",
      parent_id: category.parent_id ? String(category.parent_id) : "",
      status: category.status,
      sort: category.sort ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CategoryFormData) => {
    setSubmitting(true);
    try {
      const body = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
        status: data.status,
        sort: data.sort ?? 0,
      };

      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";

      const res = editingCategory
        ? await apiPatch(url, body)
        : await apiPost(url, body);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi");
      }

      toast.success(
        editingCategory
          ? "Đã cập nhật danh mục"
          : "Đã tạo danh mục mới"
      );
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Có lỗi xảy ra"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiDelete(`/api/admin/categories/${id}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lỗi");
      }

      toast.success("Đã xoá danh mục");
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Có lỗi xảy ra"
      );
    }
  };

  const handleReorder = async (id: number, direction: "up" | "down") => {
    const sorted = [...categories].sort(
      (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
    );
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const thisSort = sorted[idx].sort ?? idx;
    const otherSort = sorted[swapIdx].sort ?? swapIdx;

    try {
      await Promise.all([
        apiPatch(`/api/admin/categories/${sorted[idx].id}`, { sort: otherSort }),
        apiPatch(`/api/admin/categories/${sorted[swapIdx].id}`, { sort: thisSort }),
      ]);
      fetchCategories();
    } catch {
      toast.error("Không thể sắp xếp lại");
    }
  };

  // Build hierarchical list: parents first, then children indented
  const parentCategories = categories.filter((c) => !c.parent_id);
  const childCategories = categories.filter((c) => c.parent_id);

  const orderedCategories: (CategoryData & { isChild: boolean })[] = [];
  const sorted = [...parentCategories].sort(
    (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
  );

  for (const parent of sorted) {
    orderedCategories.push({ ...parent, isChild: false });
    const children = childCategories
      .filter((c) => c.parent_id === parent.id)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    for (const child of children) {
      orderedCategories.push({ ...child, isChild: true });
    }
  }

  // Also add orphan children (parent deleted)
  const listedChildIds = new Set(orderedCategories.map((c) => c.id));
  for (const child of childCategories) {
    if (!listedChildIds.has(child.id)) {
      orderedCategories.push({ ...child, isChild: true });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý danh mục
          </h1>
          <p className="text-muted-foreground">
            Tổ chức danh mục khoá học của nền tảng
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Danh sách danh mục
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orderedCategories.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Chưa có danh mục nào. Hãy tạo danh mục đầu tiên.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Khoá học</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead className="w-32">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedCategories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cat.isChild && (
                          <span className="ml-6 text-muted-foreground">
                            &#8627;
                          </span>
                        )}
                        {cat.icon && (
                          <span className="text-muted-foreground">
                            {cat.icon}
                          </span>
                        )}
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cat.slug}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cat.course_count ?? 0}
                    </TableCell>
                    <TableCell>
                      {cat.status === "published" ? (
                        <Badge className="bg-green-100 text-green-700">
                          Hoạt động
                        </Badge>
                      ) : cat.status === "draft" ? (
                        <Badge variant="secondary">Nháp</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">
                          Lưu trữ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cat.sort ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleReorder(cat.id, "up")}
                          title="Di chuyển lên"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleReorder(cat.id, "down")}
                          title="Di chuyển xuống"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(cat)}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteConfirmId(cat.id)}
                          title="Xoá"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? "Chỉnh sửa danh mục"
                : "Thêm danh mục mới"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Cập nhật thông tin danh mục."
                : "Điền thông tin để tạo danh mục mới."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên danh mục *</Label>
              <Input
                {...form.register("name")}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ví dụ: Lập trình web"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                {...form.register("slug")}
                placeholder="lap-trinh-web"
              />
              {form.formState.errors.slug && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                {...form.register("description")}
                placeholder="Mô tả ngắn về danh mục..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  {...form.register("icon")}
                  placeholder="Ví dụ: code"
                />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  {...form.register("sort", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Danh mục cha</Label>
              <Select
                value={form.watch("parent_id") || "none"}
                onValueChange={(val) =>
                  form.setValue("parent_id", val === "none" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Không có" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không có (Gốc)</SelectItem>
                  {parentCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(val) =>
                  form.setValue(
                    "status",
                    val as "published" | "draft" | "archived"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Hoạt động</SelectItem>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="archived">Lưu trữ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : editingCategory ? (
                  "Cập nhật"
                ) : (
                  "Tạo mới"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá danh mục này? Hành động này không
              thể hoàn tác. Danh mục chỉ có thể xoá khi không có khoá học nào
              được gán vào.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
