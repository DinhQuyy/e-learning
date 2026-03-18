import { directusFetch } from "@/lib/directus-fetch";
import { NextRequest, NextResponse } from "next/server";

const FIELDS =
  "fields=id,order_number,total_amount,status,payment_method,payment_ref,date_created,paid_at,user_id.id,user_id.first_name,user_id.last_name,user_id.email,items.id,items.course_id.id,items.course_id.title,items.price";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const offset = (page - 1) * limit;

  const dateFilters: string[] = [];
  if (from) dateFilters.push(`filter[date_created][_gte]=${encodeURIComponent(from)}T00:00:00`);
  if (to) dateFilters.push(`filter[date_created][_lte]=${encodeURIComponent(to)}T23:59:59`);
  const dateFilterStr = dateFilters.length > 0 ? `&${dateFilters.join("&")}` : "";

  try {
    // When a specific status tab is selected, use a normal single query
    if (status && status !== "all") {
      const res = await directusFetch(
        `/items/orders?${FIELDS}&filter[status][_eq]=${encodeURIComponent(status)}&sort=-date_created&limit=${limit}&offset=${offset}&meta=filter_count,total_count${dateFilterStr}`
      );
      if (res.status === 401) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 });
      if (!res.ok) return NextResponse.json({ error: "Không thể tải danh sách đơn hàng" }, { status: res.status });
      return NextResponse.json(await res.json());
    }

    // "Tất cả" tab: fetch ALL pending orders first (no pagination), then paginated non-pending
    // This ensures pending always appears at the very top of page 1 regardless of creation date.
    const [pendingRes, npCountRes] = await Promise.all([
      directusFetch(`/items/orders?${FIELDS}&filter[status][_eq]=pending&sort=-date_created&limit=-1${dateFilterStr}`),
      directusFetch(`/items/orders?aggregate[count]=*&filter[status][_neq]=pending${dateFilterStr}`),
    ]);

    if (pendingRes.status === 401 || npCountRes.status === 401) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 });
    }
    if (!pendingRes.ok || !npCountRes.ok) {
      return NextResponse.json({ error: "Không thể tải danh sách đơn hàng" }, { status: 500 });
    }

    const pendingJson = await pendingRes.json();
    const pendingOrders: unknown[] = pendingJson.data ?? [];
    const pendingCount = pendingOrders.length;

    const npCountJson = await npCountRes.json();
    const nonPendingTotal = Number((npCountJson.data?.[0] as { count?: { "*"?: string } } | undefined)?.count?.["*"] ?? 0);
    const totalCount = pendingCount + nonPendingTotal;

    // Compute which slice of non-pending we need for this page
    // Virtual list = [pending...] + [non-pending...]
    const pendingInPage = Math.max(0, Math.min(limit, pendingCount - offset));
    const npLimit = limit - pendingInPage;
    const npOffset = Math.max(0, offset - pendingCount);

    let nonPendingOrders: unknown[] = [];
    if (npLimit > 0) {
      const npRes = await directusFetch(
        `/items/orders?${FIELDS}&filter[status][_neq]=pending&sort=-date_created&limit=${npLimit}&offset=${npOffset}${dateFilterStr}`
      );
      if (npRes.ok) {
        nonPendingOrders = (await npRes.json()).data ?? [];
      }
    }

    const pageOrders = [
      ...pendingOrders.slice(offset, offset + pendingInPage),
      ...nonPendingOrders,
    ];

    return NextResponse.json({
      data: pageOrders,
      meta: { filter_count: totalCount, total_count: totalCount },
    });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
