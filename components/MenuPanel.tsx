"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "drink" | "sweet";
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const categories: { key: MenuItem["category"]; title: string }[] = [
  { key: "meal", title: "Meals" },
  { key: "snack", title: "Snacks" },
  { key: "sweet", title: "Sweets" },
  { key: "drink", title: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load the menu");
        if (active) {
          setItems(data.menu_items);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load the menu");
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
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="text-xs text-slate-500">Availability and prices update live.</p>
      </div>
      <div className="space-y-4 p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && items.length === 0 && <p className="text-sm text-slate-500">Loading menu...</p>}
        {categories.map(({ key, title }) => {
          const categoryItems = items.filter((item) => item.category === key);
          if (categoryItems.length === 0) return null;

          return (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold text-slate-500">{title}</h3>
              <ul className="divide-y divide-slate-100">
                {categoryItems.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.is_veg ? "bg-green-600" : "bg-red-600"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.stock === 0 && (
                          <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            Sold out
                          </span>
                        )}
                        {item.stock > 0 && item.stock <= 3 && (
                          <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                            Only {item.stock} left
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium">Rs {item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
