"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ArrowUpRight, Bag, Check, ChevronRight, Minus, Plus, Spark, Trash } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import type { CartItem, Product } from "@/lib/types";

type Store = { name: string; description: string; supportEmail: string; currency: "BRL" };
type ProductResponse = { products: Product[]; store: Store };

const customerTokenKey = "vento_customer_token";

function getCustomerToken() {
  const storedToken = window.localStorage.getItem(customerTokenKey);
  if (storedToken) return storedToken;
  const newToken = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(customerTokenKey, newToken);
  return newToken;
}

function ProductVisual({ product }: { product: Product }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <div className="relative flex h-full w-full items-end overflow-hidden bg-gradient-to-br from-[#c7ff72] via-[#86b9a6] to-[#273c3d] p-5 text-ink">
      <span className="absolute -right-5 -top-9 font-display text-[9rem] leading-none text-white/20">{product.name.slice(0, 1).toUpperCase()}</span>
      <span className="relative font-mono text-[10px] font-bold uppercase tracking-[.18em]">{product.name.slice(0, 22)}</span>
    </div>
  );
}

export function Marketplace() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store>({ name: "Vento", description: "Produtos digitais e experiências que acompanham seu ritmo.", supportEmail: "suporte@exemplo.com", currency: "BRL" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [buyer, setBuyer] = useState({ name: "", instagram: "", phone: "" });

  useEffect(() => {
    fetch("/api/products")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ProductResponse>;
      })
      .then((data) => {
        setProducts(data.products);
        setStore(data.store);
      })
      .catch(() => setMessage("Não foi possível carregar o catálogo agora."))
      .finally(() => setIsLoading(false));
  }, []);

  const detailedCart = useMemo(() => cart.flatMap((cartItem) => {
    const product = products.find((item) => item.id === cartItem.productId);
    return product ? [{ ...product, quantity: cartItem.quantity }] : [];
  }), [cart, products]);

  const itemCount = detailedCart.reduce((total, item) => total + item.quantity, 0);
  const total = detailedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function updateCart(productId: string, adjustment: number) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing && adjustment > 0) return [...current, { productId, quantity: 1 }];
      if (!existing) return current;
      const nextQuantity = existing.quantity + adjustment;
      if (nextQuantity <= 0) return current.filter((item) => item.productId !== productId);
      return current.map((item) => item.productId === productId ? { ...item, quantity: nextQuantity } : item);
    });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailedCart.length) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer, items: cart, customerToken: getCustomerToken() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir o pedido.");
      setCart([]);
      router.push("/marketplace/meus-pedidos");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grain site-grid min-h-screen bg-ink text-mist">
      <a href="#catalogo" className="focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-mint focus:px-4 focus:py-2 focus:text-ink">Ir para catálogo</a>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="/" className="focus-ring flex items-center gap-3 rounded-sm" aria-label={`${store.name}, início`}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-xs font-black text-ink">V</span>
          <span className="font-display text-lg tracking-[-.08em]">{store.name}</span>
        </a>
        <div className="flex items-center gap-2">
          <a href="/marketplace/meus-pedidos" className="focus-ring hidden rounded-full px-4 py-2 text-sm text-mist/70 transition hover:text-mist sm:block">Meus pedidos</a>
          <a href="#checkout" className="focus-ring flex items-center gap-2 rounded-full border border-mist/20 bg-panel/85 px-4 py-2 text-sm transition hover:border-mint/70">
            <Bag className="h-4 w-4 text-mint" />
            <span>Bolsa</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mint px-1 text-[10px] font-bold text-ink">{itemCount}</span>
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-10 sm:px-8 md:grid-cols-[minmax(0,1.15fr)_minmax(260px,.65fr)] md:items-end lg:px-10 lg:pb-28 lg:pt-20">
          <div className="reveal">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-mint"><Spark className="h-4 w-4" /> Seleção em movimento</p>
            <h1 className="max-w-4xl font-display text-[clamp(3.6rem,10vw,8.6rem)] leading-[.82] tracking-[-.105em] text-mist">Escolhas que <span className="text-mint">abrem</span> caminho.</h1>
          </div>
          <div className="reveal-delay mb-1 border-l border-mist/20 pl-5 md:ml-auto md:max-w-xs">
            <p className="text-base leading-7 text-mist/70">{store.description}</p>
            <a href="#catalogo" className="focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-mint">Ver a seleção <ArrowUpRight className="h-4 w-4" /></a>
          </div>
        </section>

        <section className="border-y border-mist/15 bg-panel/55 py-3">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-5 text-[11px] font-bold uppercase tracking-[.2em] text-mist/55 sm:px-8 lg:px-10">
            <span>checkout simples</span><span className="text-mint">✳</span><span>atualizações de pedido</span><span className="text-mint">✳</span><span>suporte humano</span>
          </div>
        </section>

        <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.22em] text-mint">01 / catálogo</p>
              <h2 className="mt-2 font-display text-4xl tracking-[-.08em]">Feito para agora.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-mist/55">Produtos adicionados no painel aparecem aqui automaticamente.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3"><div className="h-80 animate-pulse rounded-2xl bg-mist/5" /><div className="h-80 animate-pulse rounded-2xl bg-mist/5" /><div className="h-80 animate-pulse rounded-2xl bg-mist/5" /></div>
          ) : products.length === 0 ? (
            <div className="reveal-delay grid min-h-72 place-items-center rounded-2xl border border-dashed border-mist/20 bg-panel/45 p-8 text-center">
              <div className="max-w-md"><span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-mint/40 text-mint"><Plus className="h-5 w-5" /></span><h3 className="font-display text-3xl tracking-[-.07em]">A próxima seleção começa aqui.</h3><p className="mt-3 text-sm leading-6 text-mist/60">Ainda não há produtos publicados. Adicione itens pelo painel administrativo e esta vitrine será preenchida sem precisar editar código.</p></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => {
                const quantity = cart.find((item) => item.productId === product.id)?.quantity || 0;
                return (
                  <article key={product.id} className="group overflow-hidden rounded-2xl border border-mist/15 bg-panel/80 shadow-glow transition duration-300 hover:-translate-y-1 hover:border-mint/45" style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="h-52 overflow-hidden"><ProductVisual product={product} /></div>
                    <div className="p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl tracking-[-.07em]">{product.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-mist/60">{product.description || "Uma nova escolha da coleção Vento."}</p></div><span className="shrink-0 font-mono text-xs font-bold text-mint">{formatCurrency(product.price, store.currency)}</span></div>
                      <div className="mt-5 flex items-center justify-between border-t border-mist/10 pt-4">
                        {quantity > 0 ? <div className="flex items-center gap-1 rounded-full border border-mist/15 p-1"><button onClick={() => updateCart(product.id, -1)} className="focus-ring grid h-8 w-8 place-items-center rounded-full text-mist/80 hover:bg-mist/10" aria-label={`Remover uma unidade de ${product.name}`}><Minus className="h-3.5 w-3.5" /></button><span className="w-5 text-center text-sm font-bold">{quantity}</span><button onClick={() => updateCart(product.id, 1)} className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-mint text-ink hover:bg-[#d4ff8e]" aria-label={`Adicionar uma unidade de ${product.name}`}><Plus className="h-3.5 w-3.5" /></button></div> : <span className="text-[10px] font-bold uppercase tracking-[.17em] text-mist/40">Disponível agora</span>}
                        <button onClick={() => updateCart(product.id, 1)} className="focus-ring flex h-9 items-center gap-2 rounded-full bg-mist px-3 text-xs font-bold text-ink transition hover:bg-mint"><Bag className="h-3.5 w-3.5" /> {quantity ? "Adicionar" : "Na bolsa"}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="checkout" className="scroll-mt-6 border-t border-mist/15 bg-[#0e1516]/95">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
            <div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-mint">02 / checkout</p><h2 className="mt-3 max-w-md font-display text-5xl leading-[.9] tracking-[-.09em]">Seu pedido, sem ruído.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-mist/60">Os dados abaixo criam seu pedido e liberam a área de acompanhamento. O pagamento real pode ser conectado a este mesmo fluxo depois.</p><div className="mt-8 flex items-center gap-3 text-sm text-mist/70"><span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-ink"><Check className="h-4 w-4" /></span> Confirmação e notificações automáticas</div></div>

            <div className="rounded-2xl border border-mist/15 bg-panel p-5 shadow-glow sm:p-7">
              <div className="flex items-center justify-between border-b border-mist/10 pb-5"><h3 className="font-display text-2xl tracking-[-.07em]">Resumo da bolsa</h3><span className="font-mono text-xs text-mist/50">{itemCount} item{itemCount === 1 ? "" : "s"}</span></div>
              <div className="max-h-48 divide-y divide-mist/10 overflow-y-auto">
                {detailedCart.length ? detailedCart.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-mist/50">{item.quantity} × {formatCurrency(item.price, store.currency)}</p></div><button onClick={() => updateCart(item.id, -item.quantity)} className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-mist/45 transition hover:bg-red-400/10 hover:text-red-300" aria-label={`Remover ${item.name}`}><Trash className="h-4 w-4" /></button></div>) : <p className="py-7 text-center text-sm text-mist/45">Sua bolsa está esperando uma escolha.</p>}
              </div>
              <div className="flex items-end justify-between border-t border-mist/10 py-5"><span className="text-sm text-mist/55">Total</span><span className="font-display text-3xl tracking-[-.07em] text-mint">{formatCurrency(total, store.currency)}</span></div>
              <form onSubmit={submitOrder} className="grid gap-3" aria-label="Dados para finalizar pedido">
                <label className="text-xs font-bold text-mist/65">Seu nome<input required value={buyer.name} onChange={(event) => setBuyer({ ...buyer, name: event.target.value })} placeholder="Como podemos te chamar?" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-ink px-3 text-sm text-mist placeholder:text-mist/30" /></label>
                <label className="text-xs font-bold text-mist/65">Instagram<input required autoCapitalize="none" value={buyer.instagram} onChange={(event) => setBuyer({ ...buyer, instagram: event.target.value })} placeholder="@seuusuario" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-ink px-3 text-sm text-mist placeholder:text-mist/30" /></label>
                <label className="text-xs font-bold text-mist/65">Telefone <span className="font-normal text-mist/35">(opcional)</span><input value={buyer.phone} onChange={(event) => setBuyer({ ...buyer, phone: event.target.value })} placeholder="(00) 00000-0000" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-ink px-3 text-sm text-mist placeholder:text-mist/30" /></label>
                {message && <p className="rounded-lg border border-red-300/20 bg-red-300/10 px-3 py-2 text-xs text-red-200" role="alert">{message}</p>}
                <button disabled={!detailedCart.length || isSubmitting} className="focus-ring mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-bold text-ink transition hover:bg-[#d5ff8a] disabled:opacity-40">{isSubmitting ? "Confirmando…" : "Confirmar pedido"}<ChevronRight className="h-4 w-4" /></button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-mist/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© {new Date().getFullYear()} {store.name}</span><a className="focus-ring rounded-sm hover:text-mint" href={`mailto:${store.supportEmail}`}>Precisa de ajuda? {store.supportEmail}</a></footer>
    </div>
  );
}
