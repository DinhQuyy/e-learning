"use client";

import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Globe, Mail, Phone, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { getAssetUrl } from "@/lib/directus";
import type { CourseStudent } from "@/lib/queries/instructor";

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Đang học", variant: "default" },
  completed: { label: "Hoàn thành", variant: "secondary" },
  dropped: { label: "Đã bỏ", variant: "destructive" },
};

type Props = {
  students: CourseStudent[];
};

function getStudentName(student: CourseStudent): string {
  const user = student.user;
  if (!user || typeof user !== "object") return "Học viên";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Học viên";
}

function getStudentEmail(student: CourseStudent): string {
  const user = student.user;
  return user && typeof user === "object" ? user.email ?? "" : "";
}

type SortOption = "date_desc" | "date_asc" | "progress_desc" | "progress_asc" | "name_asc";

export function CourseStudentsTable({ students }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<CourseStudent | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("date_desc");

  const filteredStudents = useMemo(() => {
    let result = students;

    // Search by name or email
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) =>
        getStudentName(s).toLowerCase().includes(q) ||
        getStudentEmail(s).toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime();
        case "date_desc":
          return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime();
        case "progress_desc":
          return b.progress_percentage - a.progress_percentage;
        case "progress_asc":
          return a.progress_percentage - b.progress_percentage;
        case "name_asc":
          return getStudentName(a).localeCompare(getStudentName(b), "vi");
        default:
          return 0;
      }
    });

    return result;
  }, [students, search, statusFilter, sort]);

  const handleOpen = (student: CourseStudent) => {
    setSelectedStudent(student);
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedStudent(null);
    }
  };

  return (
    <>
      {/* Search, Filter, Sort */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang học</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="dropped">Đã bỏ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Mới nhất</SelectItem>
            <SelectItem value="date_asc">Cũ nhất</SelectItem>
            <SelectItem value="progress_desc">Tiến độ cao → thấp</SelectItem>
            <SelectItem value="progress_asc">Tiến độ thấp → cao</SelectItem>
            <SelectItem value="name_asc">Tên A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredStudents.length === 0 && students.length > 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Không tìm thấy học viên phù hợp.
        </p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học viên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ngày đăng ký</TableHead>
            <TableHead>Tiến độ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="pr-2 text-right">Chi tiết</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.map((student) => {
            const user = student.user;
            const name =
              user && typeof user === "object"
                ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.email
                : "Học viên";
            const email =
              user && typeof user === "object" ? user.email : undefined;
            const avatar =
              user && typeof user === "object" ? user.avatar : undefined;
            const initials =
              user && typeof user === "object"
                ? [user.first_name?.[0], user.last_name?.[0]]
                    .filter(Boolean)
                    .join("")
                    .toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "U"
                : "HV";

            const status = statusMap[student.status] ?? statusMap.active;

            return (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={getAssetUrl(avatar)} alt={name} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{name}</span>
                      {user && typeof user === "object" && user.headline ? (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {user.headline}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{email ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(student.enrolled_at), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-[140px] items-center gap-2">
                    <Progress value={student.progress_percentage} className="h-2 w-20" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(student.progress_percentage)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleOpen(student)}>
                    Xem chi tiết
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      )}

      <StudentDetailDialog
        student={selectedStudent}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}

function StudentDetailDialog({
  student,
  open,
  onOpenChange,
}: {
  student: CourseStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = student?.user;
  const name = useMemo(() => {
    if (!user || typeof user !== "object") return "Học viên";
    return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user || typeof user !== "object") return "Học viên";
    const rawRole =
      typeof user.role === "object" ? user.role?.name : user.role || "";
    const roleLower = rawRole?.toLowerCase?.() ?? "";
    if (roleLower === "administrator") return "Quản trị";
    if (roleLower === "instructor") return "Giảng viên";
    return "Học viên";
  }, [user]);

  const socialLinks = useMemo(() => {
    if (!user || typeof user !== "object" || !user.social_links) return {};
    return user.social_links as Record<string, string>;
  }, [user]);

  const courseStatus = (student && statusMap[student.status]) ?? statusMap.active;
  const enrolledDate =
    student?.enrolled_at &&
    format(new Date(student.enrolled_at), "dd/MM/yyyy", { locale: vi });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle>Chi tiết học viên</DialogTitle>
          <DialogDescription>
            Thông tin hồ sơ và tiến độ học tập của {name}
          </DialogDescription>
        </DialogHeader>

        {student ? (
          <div className="overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="grid gap-4 xl:grid-cols-[260px,minmax(0,1fr)] xl:items-start">
              <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={getAssetUrl(user?.avatar)} alt={name} />
                  <AvatarFallback className="text-lg">{name[0]}</AvatarFallback>
                </Avatar>
                <div className="mt-3 min-w-0 space-y-1">
                  <div className="break-words text-lg font-semibold">{name}</div>
                  {user && typeof user === "object" && user.headline ? (
                    <p className="break-words text-sm text-muted-foreground">{user.headline}</p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge
                    variant={
                      user && typeof user === "object" && user.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {user && typeof user === "object" && user.status === "active"
                      ? "Hoạt động"
                      : "Bị hạn chế"}
                  </Badge>
                  <Badge variant="outline">{roleLabel}</Badge>
                  <Badge variant={courseStatus.variant}>{courseStatus.label}</Badge>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <DetailRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={user && typeof user === "object" ? user.email : "Chưa có"}
                />
                {user && typeof user === "object" && user.phone ? (
                  <DetailRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Số điện thoại"
                    value={user.phone}
                  />
                ) : null}
                <DetailRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Ngày tham gia"
                  value={
                    user && typeof user === "object" && user.date_created
                      ? format(new Date(user.date_created), "dd/MM/yyyy", {
                          locale: vi,
                        })
                      : "Chưa cập nhật"
                  }
                />
              </div>
            </div>

              <div className="min-w-0 space-y-4">
                <div className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Tiến độ khóa học</p>
                    <p className="text-xs text-muted-foreground">
                      Ghi danh {enrolledDate ?? "—"}
                    </p>
                  </div>
                  <Badge variant={courseStatus.variant}>{courseStatus.label}</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Progress value={student.progress_percentage} className="h-2 flex-1" />
                  <span className="shrink-0 text-sm font-medium">
                    {Math.round(student.progress_percentage)}%
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Hồ sơ học viên</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {user && typeof user === "object" && user.bio ? (
                    <p className="whitespace-pre-wrap break-words">{user.bio}</p>
                  ) : (
                    <p>Chưa có mô tả cá nhân.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Liên kết</p>
                {Object.keys(socialLinks).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(socialLinks).map(([key, value]) => (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex max-w-full items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate capitalize">{key}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chưa có liên kết nào.
                  </p>
                )}
              </div>
            </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="break-words text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}
