"use client";

import { useEffect, useState } from "react";

import { ArrowUpRight, Bag, Check, ChevronRight, Plus, Spark, Trash } from "@/components/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Order, Product, SafeSettings } from "@/lib/types";

type PublicOrder = Omit<Order, "customerToken">;
type AdminSection = "products" | "orders" | "settings";
type ProductForm = { name: string; description: string; price: string; imageUrl: string; active: boolean };

const blankProduct: ProductForm = { name: "", description: "", price: "", imageUrl: "", active: true };

const navItems: Array<{ id: AdminSection; label: string }> = [
  { id: "products", label: "Produtos" },
  { id: "orders", label: "Pedidos" },
  { id: "settings", label: "Configurações" },
];

const statusCopy = {
  confirmed: "Confirmado",
  processing: "Em preparação",
  completed: "Concluído",
  cancelled: "Cancelado",
} satisfies Record<PublicOrder["status"], string>;

function formFromProduct(product: Product): ProductForm {
  return { name: product.name, description: product.description, price: (product.price / 100).toFixed(2), imageUrl: product.imageUrl || "", active: product.active };
}

function parsePriceToCents(value: string) {
  const normalized = value.replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<AdminSection>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [settings, setSettings] = useState<SafeSettings | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(blankProduct);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [notice, setNotice] = useState("");

  async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Algo não saiu como esperado.");
    return data as T;
  }

  async function loadDashboard() {
    try {
      const [productsData, ordersData, settingsData] = await Promise.all([
        requestJson<{ products: Product[] }>("/api/products?scope=admin"),
        requestJson<{ orders: PublicOrder[] }>("/api/orders?scope=admin"),
        requestJson<{ settings: SafeSettings }>("/api/settings"),
      ]);
      setProducts(productsData.products);
      setOrders(ordersData.orders);
      setSettings(settingsData.settings);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
    }
  }

  useEffect(() => {
    requestJson<{ authenticated: boolean }>("/api/admin/session")
      .then(({ authenticated: value }) => {
        setAuthenticated(value);
        if (value) void loadDashboard();
      })
      .catch(() => setAuthenticated(false));
  // The check only needs to happen once when the panel is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setLoginError("");
    try {
      await requestJson("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: loginPassword }) });
      setAuthenticated(true);
      setLoginPassword("");
      await loadDashboard();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setSettings(null);
    setProducts([]);
    setOrders([]);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setNotice("");
    try {
      const payload = { ...productForm, price: parsePriceToCents(productForm.price) };
      await requestJson(editingProduct ? `/api/products/${editingProduct.id}` : "/api/products", {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setProductForm(blankProduct);
      setEditingProduct(null);
      setNotice(editingProduct ? "Produto atualizado." : "Produto criado e pronto para publicar.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir “${product.name}”? Esta ação não pode ser desfeita.`)) return;
    setIsWorking(true);
    try {
      await requestJson(`/api/products/${product.id}`, { method: "DELETE" });
      setNotice("Produto removido.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível excluir o produto.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setIsWorking(true);
    setNotice("");
    try {
      const response = await requestJson<{ settings: SafeSettings }>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: settings.store, notifications: settings.notifications, adminPassword: newAdminPassword }),
      });
      setSettings(response.settings);
      setNewAdminPassword("");
      setNotice("Configurações salvas. As próximas compras já usarão estes dados.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    } finally {
      setIsWorking(false);
    }
  }

  if (authenticated === null) {
    return <div className="site-grid grid min-h-screen place-items-center bg-ink text-mist"><div className="h-10 w-10 animate-spin rounded-full border-2 border-mint border-t-transparent" aria-label="Carregando" /></div>;
  }

  if (!authenticated) {
    return (
      <main className="grain site-grid grid min-h-screen place-items-center bg-ink px-5 text-mist">
        <div className="w-full max-w-md rounded-2xl border border-mist/15 bg-panel/95 p-6 shadow-glow sm:p-8">
          <a href="/" className="focus-ring inline-flex items-center gap-2 rounded-sm text-sm text-mist/60 transition hover:text-mint"><ArrowUpRight className="h-4 w-4 rotate-[225deg]" /> Voltar à vitrine</a>
          <div className="mt-10"><span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-sm font-black text-ink">V</span><p className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-mint">acesso restrito</p><h1 className="mt-2 font-display text-5xl leading-[.86] tracking-[-.1em]">Centro de comando.</h1><p className="mt-4 text-sm leading-6 text-mist/60">Entre para atualizar catálogo, integrações e acompanhar cada pedido.</p></div>
          <form onSubmit={handleLogin} className="mt-8"><label className="text-xs font-bold text-mist/70">Senha do administrador<input autoFocus required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="focus-ring mt-2 h-12 w-full rounded-lg border border-mist/15 bg-ink px-3 text-sm text-mist" placeholder="Sua senha" /></label>{loginError && <p role="alert" className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-3 text-xs text-red-200">{loginError}</p>}<button disabled={isWorking} className="focus-ring mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-mint text-sm font-bold text-ink transition hover:bg-[#d5ff8a] disabled:opacity-50">{isWorking ? "Entrando…" : "Entrar no painel"}<ChevronRight className="h-4 w-4" /></button></form>
        </div>
      </main>
    );
  }

  const activeProductCount = products.filter((product) => product.active).length;
  const totalRevenue = orders.reduce((total, order) => total + order.total, 0);

  return (
    <div className="min-h-screen bg-[#f3f3ed] text-[#172022]">
      <header className="border-b border-[#172022]/10 bg-[#f3f3ed]/90 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8"><a href="/admin" className="focus-ring flex items-center gap-3 rounded-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#172022] text-xs font-black text-mint">V</span><span><span className="block font-display text-lg tracking-[-.08em]">Vento</span><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-[#172022]/45">admin</span></span></a><div className="flex items-center gap-2"><a href="/" className="focus-ring hidden rounded-full px-3 py-2 text-sm text-[#172022]/65 transition hover:text-[#172022] sm:block">Ver loja</a><button onClick={handleLogout} className="focus-ring rounded-full border border-[#172022]/15 px-3 py-2 text-sm font-bold transition hover:border-[#172022]/50">Sair</button></div></div></header>
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#172022]/10 p-4 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:p-6"><nav aria-label="Navegação administrativa" className="flex gap-2 overflow-x-auto lg:flex-col">{navItems.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`focus-ring shrink-0 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${section === item.id ? "bg-[#172022] text-mint" : "text-[#172022]/60 hover:bg-[#172022]/5 hover:text-[#172022]"}`}>{item.label}</button>)}</nav><div className="mt-6 hidden rounded-xl bg-[#dde2d7] p-4 lg:block"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#172022]/45">Vitrine</p><p className="mt-2 font-display text-xl tracking-[-.07em]">{settings?.store.name || "Vento"}</p><p className="mt-1 text-xs leading-5 text-[#172022]/60">As alterações são salvas em arquivos JSON locais.</p></div></aside>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#172022]/10 pb-7"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#61821f]"><Spark className="h-4 w-4" /> operações</p><h1 className="mt-2 font-display text-5xl tracking-[-.1em] sm:text-6xl">{navItems.find((item) => item.id === section)?.label}.</h1></div><div className="flex gap-2"><span className="rounded-lg bg-[#dde2d7] px-3 py-2 text-xs font-bold"><b className="text-[#61821f]">{activeProductCount}</b> ativos</span><span className="rounded-lg bg-[#172022] px-3 py-2 text-xs font-bold text-mist">{formatCurrency(totalRevenue)}</span></div></div>
          {notice && <p className="mt-5 rounded-lg border border-[#61821f]/30 bg-[#dcefc0] px-4 py-3 text-sm text-[#35560c]" role="status">{notice}</p>}

          {section === "products" && <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start"><div><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-3xl tracking-[-.07em]">Catálogo</h2><p className="mt-1 text-sm text-[#172022]/55">Publique, oculte ou ajuste itens da vitrine.</p></div><span className="font-mono text-xs text-[#172022]/45">{products.length} total</span></div>{products.length === 0 ? <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#172022]/20 bg-white/40 p-8 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#172022] text-mint"><Bag className="h-5 w-5" /></span><h3 className="mt-4 font-display text-2xl tracking-[-.07em]">Catálogo em branco.</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#172022]/55">Use o formulário ao lado para criar o primeiro produto.</p></div></div> : <div className="grid gap-3">{products.map((product) => <article key={product.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#172022]/10 bg-white/70 p-4"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#b8f15d] font-display text-xl text-[#172022]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : product.name.slice(0, 1).toUpperCase()}</div><div className="min-w-[170px] flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{product.name}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${product.active ? "bg-[#dcefc0] text-[#35560c]" : "bg-[#172022]/8 text-[#172022]/50"}`}>{product.active ? "Ativo" : "Oculto"}</span></div><p className="mt-1 line-clamp-1 text-sm text-[#172022]/50">{product.description || "Sem descrição"}</p></div><span className="font-mono text-xs font-bold text-[#61821f]">{formatCurrency(product.price)}</span><div className="flex gap-1"><button onClick={() => { setEditingProduct(product); setProductForm(formFromProduct(product)); }} className="focus-ring rounded-lg border border-[#172022]/15 px-3 py-2 text-xs font-bold transition hover:bg-[#172022] hover:text-mint">Editar</button><button onClick={() => void deleteProduct(product)} disabled={isWorking} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-[#172022]/45 transition hover:bg-red-100 hover:text-red-600" aria-label={`Excluir ${product.name}`}><Trash className="h-4 w-4" /></button></div></article>)}</div>}</div>
            <form onSubmit={saveProduct} className="rounded-2xl border border-[#172022]/15 bg-[#172022] p-5 text-mist shadow-[0_18px_45px_rgba(23,32,34,.15)]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.19em] text-mint">{editingProduct ? "editando produto" : "novo produto"}</p><h2 className="mt-1 font-display text-3xl tracking-[-.08em]">{editingProduct ? editingProduct.name : "Adicionar item"}</h2></div>{editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductForm(blankProduct); }} className="focus-ring rounded-full border border-mist/20 px-3 py-1.5 text-xs font-bold hover:border-mint hover:text-mint">Cancelar</button>}</div><div className="mt-6 grid gap-4"><label className="text-xs font-bold text-mist/70">Nome<input required minLength={2} maxLength={100} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Ex.: Guia de direção" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-[#0b1012] px-3 text-sm" /></label><label className="text-xs font-bold text-mist/70">Descrição<textarea maxLength={800} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="O que a pessoa recebe?" className="focus-ring mt-1.5 min-h-24 w-full resize-y rounded-lg border border-mist/15 bg-[#0b1012] p-3 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-mist/70">Preço (R$)<input required min="0" step="0.01" inputMode="decimal" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="29,90" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-[#0b1012] px-3 text-sm" /></label><label className="text-xs font-bold text-mist/70">Status<select value={String(productForm.active)} onChange={(event) => setProductForm({ ...productForm, active: event.target.value === "true" })} className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-[#0b1012] px-3 text-sm"><option value="true">Publicado</option><option value="false">Oculto</option></select></label></div><label className="text-xs font-bold text-mist/70">Imagem por URL <span className="font-normal text-mist/35">(opcional)</span><input type="url" value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="https://…" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-mist/15 bg-[#0b1012] px-3 text-sm" /></label><button disabled={isWorking} className="focus-ring flex h-12 items-center justify-center gap-2 rounded-lg bg-mint text-sm font-bold text-[#172022] transition hover:bg-[#d5ff8a] disabled:opacity-50">{editingProduct ? "Salvar mudanças" : "Criar produto"}<Plus className="h-4 w-4" /></button></div></form>
          </section>}

          {section === "orders" && <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-3xl tracking-[-.07em]">Últimas vendas</h2><p className="mt-1 text-sm text-[#172022]/55">O registro é salvo localmente antes de as notificações serem disparadas.</p></div><button onClick={() => void loadDashboard()} className="focus-ring rounded-full border border-[#172022]/15 px-4 py-2 text-sm font-bold transition hover:bg-[#172022] hover:text-mint">Atualizar</button></div>{orders.length === 0 ? <div className="mt-6 grid min-h-64 place-items-center rounded-2xl border border-dashed border-[#172022]/20 bg-white/40 p-8 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#172022] text-mint"><Bag className="h-5 w-5" /></span><h3 className="mt-4 font-display text-2xl tracking-[-.07em]">Nenhum pedido ainda.</h3><p className="mt-2 text-sm text-[#172022]/55">As compras feitas na vitrine chegarão aqui.</p></div></div> : <div className="mt-6 overflow-hidden rounded-2xl border border-[#172022]/10 bg-white/70"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#172022]/10 bg-[#dde2d7]/55 text-[10px] uppercase tracking-[.13em] text-[#172022]/55"><tr><th className="px-5 py-4">Pedido</th><th className="px-5 py-4">Comprador</th><th className="px-5 py-4">Itens</th><th className="px-5 py-4">Data</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y divide-[#172022]/10">{orders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-mono text-xs font-bold text-[#61821f]">{order.id}</td><td className="px-5 py-4"><p className="font-bold">{order.buyer.name}</p><p className="mt-1 text-xs text-[#172022]/50">{order.buyer.instagram || order.buyer.email || "—"}</p></td><td className="max-w-[220px] px-5 py-4 text-[#172022]/65">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</td><td className="px-5 py-4 text-xs text-[#172022]/55">{formatDate(order.createdAt)}</td><td className="px-5 py-4 font-mono text-xs font-bold">{formatCurrency(order.total)}</td><td className="px-5 py-4"><span className="rounded-full bg-[#dcefc0] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.11em] text-[#35560c]">{statusCopy[order.status]}</span></td></tr>)}</tbody></table></div></div>}</section>}

          {section === "settings" && settings && <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]"><form onSubmit={saveSettings} className="space-y-6"><div className="rounded-2xl border border-[#172022]/10 bg-white/70 p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#61821f]">vitrine</p><h2 className="mt-1 font-display text-3xl tracking-[-.07em]">Identidade da loja</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#172022]/65">Nome da loja<input required value={settings.store.name} onChange={(event) => setSettings({ ...settings, store: { ...settings.store, name: event.target.value } })} className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label><label className="text-xs font-bold text-[#172022]/65">E-mail de suporte<input required type="email" value={settings.store.supportEmail} onChange={(event) => setSettings({ ...settings, store: { ...settings.store, supportEmail: event.target.value } })} className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label><label className="text-xs font-bold text-[#172022]/65 sm:col-span-2">Descrição<input required value={settings.store.description} onChange={(event) => setSettings({ ...settings, store: { ...settings.store, description: event.target.value } })} className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label></div></div>
            <div className="rounded-2xl border border-[#172022]/10 bg-white/70 p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#61821f]">notificações</p><h2 className="mt-1 font-display text-3xl tracking-[-.07em]">Integrações de pedido</h2><label className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#172022]/10 bg-[#dde2d7]/45 p-4"><span><span className="block text-sm font-bold">Avisar a cada nova compra</span><span className="mt-1 block text-xs text-[#172022]/55">Ativa Discord e Pushcut após salvar o pedido.</span></span><input checked={settings.notifications.notifyOnNewOrder} onChange={(event) => setSettings({ ...settings, notifications: { ...settings.notifications, notifyOnNewOrder: event.target.checked } })} type="checkbox" className="h-5 w-5 accent-[#61821f]" /></label><div className="mt-5 grid gap-4"><label className="text-xs font-bold text-[#172022]/65">Webhook do Discord<input type="url" value={settings.notifications.discordWebhookUrl} onChange={(event) => setSettings({ ...settings, notifications: { ...settings.notifications, discordWebhookUrl: event.target.value } })} placeholder="https://discord.com/api/webhooks/..." className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label><label className="text-xs font-bold text-[#172022]/65">URL da notificação Pushcut<input type="url" value={settings.notifications.pushcutUrl} onChange={(event) => setSettings({ ...settings, notifications: { ...settings.notifications, pushcutUrl: event.target.value } })} placeholder="https://api.pushcut.io/v1/notifications/Nome" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label><label className="text-xs font-bold text-[#172022]/65">API Key do Pushcut<input type="password" value={settings.notifications.pushcutApiKey} onChange={(event) => setSettings({ ...settings, notifications: { ...settings.notifications, pushcutApiKey: event.target.value } })} placeholder="Sua chave Pushcut" className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label></div><p className="mt-4 text-xs leading-5 text-[#172022]/50">O Discord recebe um embed com pedido, valor, produtos e comprador. O Pushcut recebe título, texto e o ID do pedido como input.</p></div>
            <div className="rounded-2xl border border-[#172022]/10 bg-white/70 p-5 sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#61821f]">segurança</p><h2 className="mt-1 font-display text-3xl tracking-[-.07em]">Acesso administrativo</h2><label className="mt-6 block text-xs font-bold text-[#172022]/65">Nova senha <span className="font-normal text-[#172022]/40">(deixe vazio para manter a atual)</span><input type="password" minLength={8} value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} placeholder={settings.hasAdminPassword ? "Senha configurada" : "Defina uma senha de 8+ caracteres"} className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-[#172022]/15 bg-white px-3 text-sm text-[#172022]" /></label><p className="mt-3 text-xs leading-5 text-[#172022]/50">Uma senha salva aqui tem prioridade sobre <code>ADMIN_PASSWORD</code> e fica armazenada em <code>data/settings.json</code>.</p></div><button disabled={isWorking} className="focus-ring flex h-12 items-center justify-center gap-2 rounded-lg bg-[#172022] px-5 text-sm font-bold text-mint transition hover:bg-[#2a3739] disabled:opacity-50">{isWorking ? "Salvando…" : "Salvar configurações"}<Check className="h-4 w-4" /></button></form>
            <aside className="h-fit rounded-2xl bg-[#172022] p-5 text-mist"><span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-[#172022]"><Spark className="h-4 w-4" /></span><h2 className="mt-5 font-display text-3xl tracking-[-.07em]">Pronto para operar.</h2><ul className="mt-5 space-y-3 text-sm leading-5 text-mist/65"><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />Produtos ativos aparecem na página inicial.</li><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />Pedidos são gravados em JSON antes das integrações.</li><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />As integrações são opcionais e podem ser trocadas aqui.</li></ul><a href="/" className="focus-ring mt-6 flex items-center justify-between rounded-lg border border-mist/20 p-3 text-sm font-bold transition hover:border-mint hover:text-mint">Abrir vitrine <ArrowUpRight className="h-4 w-4" /></a></aside>
          </section>}
        </main>
      </div>
    </div>
  );
}
