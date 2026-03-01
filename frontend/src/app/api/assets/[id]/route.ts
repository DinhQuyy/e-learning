import { NextRequest } from "next/server";
import { directusFetch } from "@/lib/directus-fetch";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await directusFetch(`/assets/${id}`);

  // If Directus returns an error, pass it through
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "text/plain" },
    });
  }

  // Stream the asset back to the client
  const headers = new Headers(res.headers);
  return new Response(res.body, {
    status: 200,
    headers,
  });
}
