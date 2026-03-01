import { NextResponse } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const uploadRes = await directusFetch("/files", {
      method: "POST",
      body: formData as unknown as BodyInit,
    });

    if (uploadRes.status === 401) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Upload failed:", uploadRes.status, errorText);
      return NextResponse.json(
        { error: "Failed to upload file." },
        { status: uploadRes.status }
      );
    }

    const uploadData = await uploadRes.json();

    return NextResponse.json(uploadData);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
