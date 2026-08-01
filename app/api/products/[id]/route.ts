import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { getProducts, saveProducts } from "@/lib/storage";

type RouteContext = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const products = await getProducts();
    const index = products.findIndex((product) => product.id === params.id);
    if (index === -1) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

    const previous = products[index];
    const name = typeof body.name === "string" ? body.name.trim() : previous.name;
    const description = typeof body.description === "string" ? body.description.trim() : previous.description;
    const price = body.price === undefined ? previous.price : Number(body.price);
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 1000) : previous.imageUrl;
    const active = typeof body.active === "boolean" ? body.active : previous.active;

    if (name.length < 2 || name.length > 100 || description.length > 800 || !Number.isInteger(price) || price < 0 || price > 100_000_000) {
      return NextResponse.json({ error: "Dados do produto inválidos." }, { status: 400 });
    }

    const product = { ...previous, name, description, price, imageUrl: imageUrl || undefined, active, updatedAt: new Date().toISOString() };
    products[index] = product;
    await saveProducts(products);
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o produto." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const products = await getProducts();
  const nextProducts = products.filter((product) => product.id !== params.id);
  if (products.length === nextProducts.length) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  await saveProducts(nextProducts);
  return NextResponse.json({ ok: true });
}
