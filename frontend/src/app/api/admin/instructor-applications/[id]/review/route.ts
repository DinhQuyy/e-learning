import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { directusFetch, getDirectusError } from "@/lib/directus-fetch";
import {
  createApplicationHistory,
  fetchApplicationById,
  fetchCurrentUserProfile,
  isAdminUser,
  resolveRoleIdByName,
} from "@/lib/instructor-application-service";
import { notifyInstructorApplicationStatus } from "@/lib/notifications-helper";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_INFO"]),
  admin_note: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const me = await fetchCurrentUserProfile();

    if (!me.ok || !me.data) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isAdminUser(me.data)) {
      return NextResponse.json(
        { error: "Khong co quyen truy cap" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Du lieu khong hop le";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const targetStatus = parsed.data.status;
    const adminNote = parsed.data.admin_note?.trim() || null;

    if (targetStatus !== "APPROVED" && !adminNote) {
      return NextResponse.json(
        { error: "Vui long nhap ghi chu cho ket qua review nay" },
        { status: 400 },
      );
    }

    const existingResult = await fetchApplicationById(id);
    if (!existingResult.ok || !existingResult.data) {
      return NextResponse.json(
        { error: "Khong tim thay don dang ky" },
        { status: existingResult.status === 404 ? 404 : 400 },
      );
    }

    const existing = existingResult.data;

    if (existing.status !== "PENDING" && existing.status !== "NEEDS_INFO") {
      return NextResponse.json(
        { error: "Don nay da o trang thai ket thuc va khong the review lai" },
        { status: 400 },
      );
    }

    const applicantId =
      typeof existing.user_id === "string" ? existing.user_id : existing.user_id?.id;

    if (!applicantId) {
      return NextResponse.json(
        { error: "Khong xac dinh duoc nguoi nop don" },
        { status: 400 },
      );
    }

    let previousRoleId: string | null = null;
    let previousInstructorState: string | null = null;
    let userChanged = false;

    if (targetStatus === "APPROVED") {
      if (typeof existing.user_id !== "string") {
        const role = existing.user_id.role;
        previousRoleId = typeof role === "string" ? role : role?.id || null;
        previousInstructorState = existing.user_id.instructor_state || null;
      }

      const instructorRoleId = await resolveRoleIdByName("instructor");

      if (!instructorRoleId) {
        return NextResponse.json(
          { error: "Khong tim thay role Instructor trong he thong" },
          { status: 500 },
        );
      }

      const updateUserRes = await directusFetch(
        `/users/${encodeURIComponent(applicantId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: instructorRoleId,
            instructor_state: "APPROVED",
          }),
        },
      );

      if (!updateUserRes.ok) {
        const message = await getDirectusError(
          updateUserRes,
          "Khong the cap nhat role Instructor",
        );
        return NextResponse.json(
          { error: message },
          { status: updateUserRes.status || 500 },
        );
      }

      userChanged = true;
    }

    const nowIso = new Date().toISOString();
    const updateApplicationRes = await directusFetch(
      `/items/instructor_applications/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: targetStatus,
          admin_note: adminNote,
          reviewed_by: me.data.id,
          reviewed_at: nowIso,
        }),
      },
    );

    if (!updateApplicationRes.ok) {
      if (userChanged) {
        const rollbackPayload: Record<string, string> = {};
        if (previousRoleId) {
          rollbackPayload.role = previousRoleId;
        }
        if (previousInstructorState) {
          rollbackPayload.instructor_state = previousInstructorState;
        }

        if (Object.keys(rollbackPayload).length > 0) {
          await directusFetch(`/users/${encodeURIComponent(applicantId)}`, {
            method: "PATCH",
            body: JSON.stringify(rollbackPayload),
          }).catch(() => undefined);
        }
      }

      const message = await getDirectusError(
        updateApplicationRes,
        "Khong the cap nhat trang thai don",
      );
      return NextResponse.json(
        { error: message },
        { status: updateApplicationRes.status || 500 },
      );
    }

    const updatedPayload = await updateApplicationRes.json().catch(() => null);
    const updated = updatedPayload?.data;

    await createApplicationHistory(
      id,
      existing.status,
      targetStatus,
      me.data.id,
      adminNote,
    );

    notifyInstructorApplicationStatus(applicantId, targetStatus, adminNote).catch(
      () => undefined,
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(
      "POST /api/admin/instructor-applications/[id]/review error:",
      error,
    );
    return NextResponse.json({ error: "Loi he thong" }, { status: 500 });
  }
}
