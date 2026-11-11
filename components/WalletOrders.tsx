"use client";

import { useEffect, useState } from "react";

type Wallet = { name: string; balance: number };
type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time: string | null;
  items: string[];
};

const statusStyles: Record<string, string> = {
  placed: "bg-sky-100 text-sky-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  collected: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load your account");
        if (active) {
          setWallet(data.wallet);
          setOrders(data.orders);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load your account");
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="rounded-xl bg-slate-900 p-4 text-white shadow-sm">
      <div>
        <p className="text-sm text-slate-300">Wallet balance</p>
        <p className="mt-1 text-3xl font-semibold">
          {wallet ? `Rs ${wallet.balance}` : "—"}
        </p>
        <p className="mt-1 text-sm text-slate-300">{wallet?.name ?? "Loading student..."}</p>
      </div>

      <div className="mt-5 border-t border-slate-700 pt-4">
        <h2 className="font-semibold">My orders today</h2>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        {!error && orders.length === 0 && (
          <p className="mt-2 text-sm text-slate-300">No orders yet.</p>
        )}
        <ul className="mt-2 divide-y divide-slate-700">
          {orders.map((order) => (
            <li key={order.id} className="py-3 first:pt-1 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Order #{order.id}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusStyles[order.status] ?? "bg-slate-700 text-slate-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Pickup {order.pickup_time ?? "time unavailable"} · {order.items.join(", ") || "Items unavailable"}
              </p>
              <p className="mt-1 text-sm font-medium">Rs {order.total}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
