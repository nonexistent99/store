import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminCookieOptions, createAdminSession, isValidAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (!(await isValidAdminPassword(password))) {
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Envie uma senha válida." }, { status: 400 });
  }
}
