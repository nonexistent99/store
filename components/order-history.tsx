"use client";

import { useEffect, useState } from "react";

import { ArrowUpRight, Bag, Check, ChevronRight, Spark } from "@/components/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

type PublicOrder = Omit<Order, "customerToken">;

const statusCopy = {
  confirmed: "Confirmado",
  processing: "Em preparação",
  completed: "Concluído",
  cancelled: "Cancelado",
} satisfies Record<PublicOrder["status"], string>;

export function OrderHistory() {
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const customerToken = window.localStorage.getItem("vento_customer_token");
    if (!customerToken) {
      setIsLoading(false);
      return;
    }
    fetch(`/api/orders?customerToken=${encodeURIComponent(customerToken)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os pedidos.");
        return data.orders as PublicOrder[];
      })
      .then(setOrders)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="grain site-grid min-h-screen bg-ink text-mist">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="/" className="focus-ring flex items-center gap-3 rounded-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-xs font-black text-ink">V</span><span className="font-display text-lg tracking-[-.08em]">Vento</span></a>
        <a href="/" className="focus-ring flex items-center gap-2 rounded-full border border-mist/20 px-4 py-2 text-sm transition hover:border-mint hover:text-mint">Voltar à vitrine <ArrowUpRight className="h-4 w-4" /></a>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
        <p className="reveal flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-mint"><Spark className="h-4 w-4" /> área do cliente</p>
        <div className="reveal-delay mt-5 flex flex-wrap items-end justify-between gap-6 border-b border-mist/15 pb-9"><div><h1 className="font-display text-[clamp(3.5rem,8vw,6rem)] leading-[.82] tracking-[-.1em]">Meus <span className="text-mint">pedidos.</span></h1><p className="mt-5 max-w-lg text-sm leading-6 text-mist/60">Acompanhe o status de cada compra feita neste dispositivo.</p></div><a className="focus-ring flex items-center gap-2 rounded-full bg-mist px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-mint" href="/"><Bag className="h-4 w-4" /> Continuar comprando</a></div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-live="polite">
            {isLoading ? <div className="h-64 animate-pulse rounded-2xl border border-mist/10 bg-panel/60" /> : error ? <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-sm text-red-100">{error}</div> : orders.length === 0 ? <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-mist/20 bg-panel/50 p-8 text-center"><div><span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-mint/40 text-mint"><Bag className="h-5 w-5" /></span><h2 className="font-display text-3xl tracking-[-.07em]">Nenhum pedido por aqui.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-mist/55">Quando você confirmar uma compra, ela aparecerá nesta lista automaticamente.</p></div></div> : <div className="space-y-4">{orders.map((order) => <article key={order.id} className="overflow-hidden rounded-2xl border border-mist/15 bg-panel/80 shadow-glow"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist/10 px-5 py-4"><div><p className="font-mono text-[11px] font-bold text-mint">{order.id}</p><p className="mt-1 text-xs text-mist/45">{formatDate(order.createdAt)}</p></div><span className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-mint">{statusCopy[order.status]}</span></div><div className="divide-y divide-mist/10 px-5">{order.items.map((item) => <div key={item.productId} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-mist/50">{item.quantity} unidade{item.quantity === 1 ? "" : "s"}</p></div><span className="font-mono text-xs text-mist/70">{formatCurrency(item.price * item.quantity)}</span></div>)}</div><div className="flex items-center justify-between bg-mist/[.035] px-5 py-4"><span className="text-sm text-mist/55">Total</span><span className="font-display text-2xl tracking-[-.07em] text-mint">{formatCurrency(order.total)}</span></div></article>)}</div>}
          </section>
          <aside className="h-fit rounded-2xl border border-mist/15 bg-[#152022] p-5"><div className="grid h-9 w-9 place-items-center rounded-full bg-mint text-ink"><Check className="h-5 w-5" /></div><h2 className="mt-5 font-display text-3xl tracking-[-.07em]">Fale com a gente.</h2><p className="mt-3 text-sm leading-6 text-mist/60">Em breve, você poderá iniciar uma conversa vinculada a cada pedido diretamente por aqui.</p><button disabled className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-mist/15 px-4 py-3 text-sm font-bold text-mist/35">Chat em breve <ChevronRight className="h-4 w-4" /></button></aside>
        </div>
      </main>
    </div>
  );
}

// TODO(chat): conectar esta área a um provedor de chat e manter o vínculo pelo ID do pedido.
