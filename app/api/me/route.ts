import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstRelated<T extends object>(relation: T | T[] | null | undefined): T | undefined {
  return Array.isArray(relation) ? relation[0] : relation ?? undefined;
}

export async function GET() {
  const supabase = getSupabase();
  const [walletResult, ordersResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (walletResult.error) {
    console.error("[GET /api/me wallet]", walletResult.error.message);
    return NextResponse.json({ error: walletResult.error.message }, { status: 500 });
  }
  if (ordersResult.error) {
    console.error("[GET /api/me orders]", ordersResult.error.message);
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  const orders = ordersResult.data.map((order) => {
    const pickupSlot = firstRelated(order.pickup_slots);
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      pickup_time: pickupSlot?.slot_time ? formatSlot(pickupSlot.slot_time) : null,
      items: order.order_items
        .map((item) => firstRelated(item.menu_items)?.name)
        .filter((name): name is string => Boolean(name)),
    };
  });

  return NextResponse.json({ wallet: walletResult.data, orders });
}
