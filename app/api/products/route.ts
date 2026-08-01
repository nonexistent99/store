import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { getProducts, getSettings, saveProducts } from "@/lib/storage";
import type { Product } from "@/lib/types";

function isUsableProduct(body: Record<string, unknown>) {
  const price = Number(body.price);
  return (
    typeof body.name === "string" && body.name.trim().length >= 2 && body.name.trim().length <= 100 &&
    typeof body.description === "string" && body.description.trim().length <= 800 &&
    Number.isInteger(price) && price >= 0 && price <= 100_000_000
  );
}

export async function GET(request: NextRequest) {
  const products = await getProducts();
  const isAdminScope = request.nextUrl.searchParams.get("scope") === "admin";

  if (isAdminScope) {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ products });
  }

  const settings = await getSettings();
  return NextResponse.json({
    products: products.filter((product) => product.active),
    store: settings.store,
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || !isUsableProduct(body)) {
      return NextResponse.json({ error: "Revise nome, descrição e preço do produto." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 1000) : "";
    const product: Product = {
      id: `prd_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      name: body.name.trim(),
      description: body.description.trim(),
      price: Number(body.price),
      imageUrl: imageUrl || undefined,
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    };

    const products = await getProducts();
    products.unshift(product);
    await saveProducts(products);
    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o produto." }, { status: 400 });
  }
}
