"use client";

import { useCallback, useEffect, useState } from "react";

type KitchenOrder = {
  id: number;
  status: "placed" | "preparing" | "ready";
  total: number;
  student_name: string | null;
  pickup_time: string | null;
  items: { name: string | null; quantity: number }[];
};

type Related<T> = T | T[] | null | undefined;

function firstRelated<T>(value: Related<T>): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

const columns: {
  status: KitchenOrder["status"];
  title: string;
  buttonLabel: string;
  nextStatus: "preparing" | "ready" | "collected";
  buttonStyle: string;
}[] = [
  {
    status: "placed",
    title: "New orders",
    buttonLabel: "Start preparing",
    nextStatus: "preparing",
    buttonStyle: "bg-amber-400 text-slate-950 hover:bg-amber-300",
  },
  {
    status: "preparing",
    title: "Preparing",
    buttonLabel: "Mark ready",
    nextStatus: "ready",
    buttonStyle: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  },
  {
    status: "ready",
    title: "Ready for pickup",
    buttonLabel: "Collected",
    nextStatus: "collected",
    buttonStyle: "bg-slate-600 text-white hover:bg-slate-500",
  },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/kitchen", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load kitchen orders");

      const normalized: KitchenOrder[] = (data.orders as Array<{
        id: number;
        status: KitchenOrder["status"];
        total: number;
        student_name?: Related<string>;
        wallets?: Related<{ name: string }>;
        pickup_time?: Related<string>;
        pickup_slots?: Related<{ slot_time: string }>;
        items?: Related<{ name: string | null; quantity: number }>[];
        order_items?: Related<{
          quantity: number;
          menu_items: Related<{ name: string }>;
        }>[];
      }>).map((order) => {
        const wallet = firstRelated(order.wallets);
        const pickup = firstRelated(order.pickup_slots);
        const items =
          order.items?.map((item) => firstRelated(item)).filter(
            (item): item is { name: string | null; quantity: number } => Boolean(item)
          ) ??
          order.order_items?.map((item) => {
            const row = firstRelated(item);
            return row
              ? { name: firstRelated(row.menu_items)?.name ?? null, quantity: row.quantity }
              : null;
          }).filter(
            (item): item is { name: string | null; quantity: number } => Boolean(item)
          ) ??
          [];

        return {
          id: order.id,
          status: order.status,
          total: order.total,
          student_name: firstRelated(order.student_name) ?? wallet?.name ?? null,
          pickup_time:
            firstRelated(order.pickup_time) ??
            (pickup?.slot_time ? pickup.slot_time : null),
          items,
        };
      });

      setOrders(normalized);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load kitchen orders");
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 3000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  async function updateOrder(orderId: number, status: "preparing" | "ready" | "collected") {
    setUpdating(orderId);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update order");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">CampusBite · SRM</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">Kitchen board</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className="min-w-0">
              <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-semibold">{column.title}</h2>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  {columnOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <article key={order.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">Order #{order.id}</h3>
                      <span className="rounded-md bg-slate-800 px-2 py-1 text-sm font-medium text-amber-200">
                        {order.pickup_time ?? "Pickup time unavailable"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{order.student_name ?? "Student unavailable"}</p>
                    <ul className="my-4 space-y-1 border-y border-slate-800 py-3 text-sm">
                      {order.items.map((item, index) => (
                        <li key={`${item.name ?? "item"}-${index}`} className="flex justify-between gap-3">
                          <span>{item.name ?? "Item"} × {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mb-3 text-right text-sm font-semibold">Total: Rs {order.total}</div>
                    <button
                      type="button"
                      onClick={() => void updateOrder(order.id, column.nextStatus)}
                      disabled={updating === order.id}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${column.buttonStyle}`}
                    >
                      {updating === order.id ? "Updating..." : column.buttonLabel}
                    </button>
                  </article>
                ))}
                {columnOrders.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
                    No orders
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
