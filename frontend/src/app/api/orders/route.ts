import { NextRequest, NextResponse } from "next/server";
import { directusFetch, getCurrentUserId } from "@/lib/directus-fetch";
import {
  CART_CHECKOUT_ITEM_FIELDS,
  ORDER_LIST_FIELDS,
} from "@/lib/directus-fields";

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${date}-${rand}`;
}

export async function GET() {
  try {
    const res = await directusFetch(
      `/items/orders?fields=${ORDER_LIST_FIELDS}&sort=-date_created`
    );

    if (res.status === 401) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (!res.ok) return NextResponse.json({ error: "Không thể tải đơn hàng" }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payment_method } = await request.json();
    if (!payment_method) return NextResponse.json({ error: "Thiếu phương thức thanh toán" }, { status: 400 });

    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Không xác định được người dùng" }, { status: 401 });

    // Get cart items
    const cartRes = await directusFetch(
      `/items/cart_items?fields=${CART_CHECKOUT_ITEM_FIELDS}`
    );

    if (!cartRes.ok) return NextResponse.json({ error: "Không thể tải giỏ hàng" }, { status: 500 });
    const cartData = await cartRes.json();
    const cartItems = cartData.data ?? [];

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Giỏ hàng trống" }, { status: 400 });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItemsData: { course_id: string; price: number }[] = [];

    for (const item of cartItems) {
      const course = typeof item.course_id === "object" ? item.course_id : null;
      if (!course) continue;
      const basePrice = Number(course.price ?? 0);
      const dp = course.discount_price !== null && course.discount_price !== undefined
        ? Number(course.discount_price)
        : null;
      const price = dp !== null && dp >= 0 && dp < basePrice ? dp : basePrice;
      totalAmount += price;
      orderItemsData.push({ course_id: course.id, price });
    }

    // Create order
    const orderRes = await directusFetch("/items/orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        order_number: generateOrderNumber(),
        total_amount: totalAmount,
        status: "pending",
        payment_method,
      }),
    });

    if (!orderRes.ok) return NextResponse.json({ error: "Không thể tạo đơn hàng" }, { status: 500 });
    const orderData = await orderRes.json();
    const order = orderData.data;

    // Create order items
    for (const oi of orderItemsData) {
      await directusFetch("/items/order_items", {
        method: "POST",
        body: JSON.stringify({ order_id: order.id, ...oi }),
      });
    }

    // Clear cart
    for (const item of cartItems) {
      await directusFetch(`/items/cart_items/${item.id}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
