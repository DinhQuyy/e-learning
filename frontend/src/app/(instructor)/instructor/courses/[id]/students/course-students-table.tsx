"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAssetUrl } from "@/lib/directus";
import type { CourseStudent } from "@/lib/queries/instructor";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Globe, Mail, Phone } from "lucide-react";

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

export function CourseStudentsTable({ students }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<CourseStudent | null>(
    null
  );
  const [open, setOpen] = useState(false);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Học viên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ngày đăng ký</TableHead>
            <TableHead>Tiến độ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right pr-2">Chi tiết</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
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
                      <AvatarFallback className="text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{name}</span>
                      {user && typeof user === "object" && user.headline && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {user.headline}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {email ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(student.enrolled_at), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <Progress
                      value={student.progress_percentage}
                      className="h-2 w-20"
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(student.progress_percentage)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpen(student)}
                  >
                    Xem chi tiết
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
    return (
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    );
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

  const courseStatus =
    (student && statusMap[student.status]) ?? statusMap.active;

  const enrolledDate =
    student?.enrolled_at &&
    format(new Date(student.enrolled_at), "dd/MM/yyyy", { locale: vi });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chi tiết học viên</DialogTitle>
          <DialogDescription>
            Thông tin hồ sơ và tiến độ học tập của {name}
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="grid gap-6 md:grid-cols-[240px,1fr]">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={getAssetUrl(user?.avatar)} alt={name} />
                  <AvatarFallback className="text-lg">{name[0]}</AvatarFallback>
                </Avatar>
                <div className="mt-3 space-y-1">
                  <div className="text-lg font-semibold">{name}</div>
                  {user && typeof user === "object" && user.headline && (
                    <p className="text-sm text-muted-foreground">
                      {user.headline}
                    </p>
                  )}
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
                  <Badge variant={courseStatus.variant}>
                    {courseStatus.label}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <DetailRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={
                    user && typeof user === "object" ? user.email : "Chưa có"
                  }
                />
                {user && typeof user === "object" && user.phone && (
                  <DetailRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Số điện thoại"
                    value={user.phone}
                  />
                )}
                <DetailRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Ngày tham gia"
                  value={
                    user &&
                    typeof user === "object" &&
                    user.date_created
                      ? format(new Date(user.date_created), "dd/MM/yyyy", {
                          locale: vi,
                        })
                      : "Chưa cập nhật"
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Tiến độ khoá học</p>
                    <p className="text-xs text-muted-foreground">
                      Ghi danh {enrolledDate ?? "—"}
                    </p>
                  </div>
                  <Badge variant={courseStatus.variant}>
                    {courseStatus.label}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress
                    value={student.progress_percentage}
                    className="h-2 flex-1"
                  />
                  <span className="text-sm font-medium">
                    {Math.round(student.progress_percentage)}%
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Hồ sơ học viên</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {user && typeof user === "object" && user.bio ? (
                    <p className="whitespace-pre-wrap">{user.bio}</p>
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
                        className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="capitalize">{key}</span>
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
        )}
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
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}
