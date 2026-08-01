import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { notifyNewOrder } from "@/lib/notifications";
import { getOrders, getProducts, getSettings, saveOrders } from "@/lib/storage";
import type { CartItem, Order } from "@/lib/types";

function withoutCustomerToken(order: Order) {
  const { customerToken: _customerToken, ...safeOrder } = order;
  return safeOrder;
}

export async function GET(request: NextRequest) {
  const orders = await getOrders();
  if (request.nextUrl.searchParams.get("scope") === "admin" && isAdminRequest(request)) {
    return NextResponse.json({ orders: orders.map(withoutCustomerToken) });
  }

  const customerToken = request.nextUrl.searchParams.get("customerToken");
  if (!customerToken || customerToken.length < 16) {
    return NextResponse.json({ error: "Identificação de pedidos ausente." }, { status: 401 });
  }

  return NextResponse.json({
    orders: orders.filter((order) => order.customerToken === customerToken).map(withoutCustomerToken),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const buyer = body?.buyer;
    const requestedItems = body?.items as CartItem[] | undefined;
    const customerToken = body?.customerToken;

    if (
      !buyer ||
      typeof buyer.name !== "string" || buyer.name.trim().length < 2 || buyer.name.trim().length > 100 ||
      typeof buyer.instagram !== "string" || !/^@?[a-zA-Z0-9._]{1,30}$/.test(buyer.instagram.trim()) ||
      !Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 20 ||
      typeof customerToken !== "string" || customerToken.length < 16 || customerToken.length > 128
    ) {
      return NextResponse.json({ error: "Confira os dados do checkout e tente novamente." }, { status: 400 });
    }

    const products = await getProducts();
    const quantities = new Map<string, number>();
    for (const item of requestedItems) {
      if (!item || typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return NextResponse.json({ error: "Itens do carrinho inválidos." }, { status: 400 });
      }
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    }

    const items = Array.from(quantities.entries()).map(([productId, quantity]) => {
      const product = products.find((candidate) => candidate.id === productId && candidate.active);
      return product ? { productId, name: product.name, price: product.price, quantity } : null;
    });
    if (items.some((item) => !item) || items.length === 0) {
      return NextResponse.json({ error: "Um dos produtos não está mais disponível." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const orderItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
    const order: Order = {
      id: `ORD-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      customerToken,
      buyer: {
        name: buyer.name.trim(),
        instagram: `@${buyer.instagram.trim().replace(/^@+/, "").toLowerCase()}`,
        phone: typeof buyer.phone === "string" ? buyer.phone.trim().slice(0, 32) || undefined : undefined,
      },
      items: orderItems,
      total: orderItems.reduce((total, item) => total + item.price * item.quantity, 0),
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    };

    const orders = await getOrders();
    orders.unshift(order);
    await saveOrders(orders);

    const settings = await getSettings();
    const notifications = await notifyNewOrder(order, settings);
    return NextResponse.json({ order: withoutCustomerToken(order), notifications }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível concluir o pedido." }, { status: 400 });
  }
}
