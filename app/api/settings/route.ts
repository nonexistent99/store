import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/storage";
import type { SafeSettings, Settings } from "@/lib/types";

function toSafeSettings(settings: Settings): SafeSettings {
  const { adminPassword, ...safeSettings } = settings;
  return { ...safeSettings, hasAdminPassword: Boolean(adminPassword || process.env.ADMIN_PASSWORD) };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ settings: toSafeSettings(await getSettings()) });
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const current = await getSettings();
    const storeInput = body?.store ?? {};
    const notificationInput = body?.notifications ?? {};
    const next: Settings = {
      ...current,
      store: {
        name: typeof storeInput.name === "string" ? storeInput.name.trim().slice(0, 80) : current.store.name,
        description: typeof storeInput.description === "string" ? storeInput.description.trim().slice(0, 280) : current.store.description,
        supportEmail: typeof storeInput.supportEmail === "string" ? storeInput.supportEmail.trim().slice(0, 160) : current.store.supportEmail,
        currency: "BRL",
      },
      notifications: {
        notifyOnNewOrder: typeof notificationInput.notifyOnNewOrder === "boolean" ? notificationInput.notifyOnNewOrder : current.notifications.notifyOnNewOrder,
        discordWebhookUrl: typeof notificationInput.discordWebhookUrl === "string" ? notificationInput.discordWebhookUrl.trim().slice(0, 1000) : current.notifications.discordWebhookUrl,
        pushcutUrl: typeof notificationInput.pushcutUrl === "string" ? notificationInput.pushcutUrl.trim().slice(0, 1000) : current.notifications.pushcutUrl,
        pushcutApiKey: typeof notificationInput.pushcutApiKey === "string" ? notificationInput.pushcutApiKey.trim().slice(0, 500) : current.notifications.pushcutApiKey,
      },
    };

    if (!next.store.name || !next.store.description || !/^\S+@\S+\.\S+$/.test(next.store.supportEmail)) {
      return NextResponse.json({ error: "Preencha nome, descrição e e-mail de suporte válidos." }, { status: 400 });
    }
    for (const url of [next.notifications.discordWebhookUrl, next.notifications.pushcutUrl]) {
      if (url && !/^https:\/\//.test(url)) {
        return NextResponse.json({ error: "As URLs de integração devem iniciar com https://" }, { status: 400 });
      }
    }
    if (typeof body?.adminPassword === "string" && body.adminPassword.trim()) {
      if (body.adminPassword.trim().length < 8 || body.adminPassword.trim().length > 200) {
        return NextResponse.json({ error: "A nova senha deve ter entre 8 e 200 caracteres." }, { status: 400 });
      }
      next.adminPassword = body.adminPassword.trim();
    }

    await saveSettings(next);
    return NextResponse.json({ settings: toSafeSettings(next) });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar as configurações." }, { status: 400 });
  }
}
