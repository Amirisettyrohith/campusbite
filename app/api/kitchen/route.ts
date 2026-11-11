import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["placed", "preparing", "ready", "collected"]),
});

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(
      "id, status, total, created_at, wallets(name), pickup_slots(slot_time), order_items(quantity, menu_items(name))"
    )
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    student_name: order.wallets[0]?.name ?? null,
    pickup_time: order.pickup_slots[0]?.slot_time
      ? formatSlot(order.pickup_slots[0].slot_time)
      : null,
    items: order.order_items.map((item) => ({
      name: item.menu_items[0]?.name ?? null,
      quantity: item.quantity,
    })),
  }));

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order status update", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { order_id, status } = parsed.data;
  const supabase = getSupabase();
  const { data: current, error: currentError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", order_id)
    .maybeSingle();

  if (currentError) {
    console.error("[POST /api/kitchen current order]", currentError.message);
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: `Order ${order_id} not found` }, { status: 404 });
  }
  if (nextStatus[current.status] !== status) {
    return NextResponse.json(
      { error: `Order can only move from ${current.status} to ${nextStatus[current.status] ?? "no further status"}` },
      { status: 409 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order_id)
    .eq("status", current.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("[POST /api/kitchen update order]", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Order status changed concurrently; refresh and try again." }, { status: 409 });
  }

  return NextResponse.json({ order: updated });
}
