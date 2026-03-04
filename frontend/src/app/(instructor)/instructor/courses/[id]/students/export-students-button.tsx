"use client";

import { useCallback } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseStudent } from "@/lib/queries/instructor";

type Props = {
  courseId: string;
  students: CourseStudent[];
};

const statusLabelMap: Record<string, string> = {
  active: "Đang học",
  completed: "Hoàn thành",
  dropped: "Đã bỏ",
};

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
}

function getStudentName(student: CourseStudent): string {
  const user = student.user;
  if (!user || typeof user !== "object") return "";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

function buildRows(students: CourseStudent[]): string[][] {
  return students.map((student, index) => {
    const user = student.user;
    const status = statusLabelMap[student.status] ?? student.status;

    return [
      String(index + 1),
      getStudentName(student),
      user?.email ?? "",
      user?.phone ?? "",
      formatDate(student.enrolled_at),
      String(Math.round(student.progress_percentage)),
      status,
    ];
  });
}

export function ExportStudentsButton({ courseId, students }: Props) {
  const handleExport = useCallback(() => {
    if (students.length === 0) return;

    const generatedAt = new Date();
    const fileDate = generatedAt.toISOString().slice(0, 10);
    const rows = buildRows(students);
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
      compress: true,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Báo cáo học viên khóa học", 40, 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Mã khóa học: ${courseId}`, 40, 58);
    doc.text(`Thời gian tạo: ${generatedAt.toLocaleString("vi-VN")}`, 40, 74);
    doc.text(`Tổng học viên: ${students.length}`, 40, 90);

    autoTable(doc, {
      startY: 110,
      head: [["STT", "Họ tên", "Email", "Số điện thoại", "Ngày ghi danh", "Tiến độ (%)", "Trạng thái"]],
      body: rows,
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 5,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 120 },
        2: { cellWidth: 180 },
        3: { cellWidth: 98 },
        4: { cellWidth: 82 },
        5: { cellWidth: 76, halign: "right" },
        6: { cellWidth: 75 },
      },
      margin: { left: 40, right: 40, top: 40, bottom: 40 },
      didDrawPage: () => {
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(9);
        doc.text(`Trang ${pageNumber}`, pageSize.getWidth() - 80, pageSize.getHeight() - 20);
      },
    });

    doc.save(`course-${courseId}-students-${fileDate}.pdf`);
  }, [courseId, students]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={students.length === 0}>
      <Download className="mr-2 size-4" />
      Xuất PDF
    </Button>
  );
}
