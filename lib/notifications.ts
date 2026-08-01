import type { Order, Settings } from "@/lib/types";

import { formatCurrency } from "@/lib/format";

export type NotificationResult = {
  discord: "sent" | "skipped" | "failed";
  pushcut: "sent" | "skipped" | "failed";
};

export async function notifyNewOrder(order: Order, settings: Settings): Promise<NotificationResult> {
  const result: NotificationResult = { discord: "skipped", pushcut: "skipped" };
  if (!settings.notifications.notifyOnNewOrder) return result;

  const productList = order.items.map((item) => `${item.quantity}× ${item.name}`).join("\n");
  const total = formatCurrency(order.total, settings.store.currency);

  if (settings.notifications.discordWebhookUrl) {
    try {
      const response = await fetch(settings.notifications.discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: `${settings.store.name} · pedidos`,
          embeds: [
            {
              title: "Novo pedido confirmado",
              color: 0xb8f15d,
              fields: [
                { name: "Pedido", value: `#${order.id}`, inline: true },
                { name: "Total", value: total, inline: true },
                { name: "Comprador", value: `${order.buyer.name}\n${order.buyer.instagram || order.buyer.email || "—"}` },
                { name: "Itens", value: productList || "—" },
              ],
              timestamp: order.createdAt,
            },
          ],
        }),
      });
      result.discord = response.ok ? "sent" : "failed";
    } catch {
      result.discord = "failed";
    }
  }

  if (settings.notifications.pushcutUrl) {
    try {
      const response = await fetch(settings.notifications.pushcutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.notifications.pushcutApiKey
            ? { "API-Key": settings.notifications.pushcutApiKey }
            : {}),
        },
        body: JSON.stringify({
          title: "Novo pedido",
          text: `${order.buyer.name} · ${total}`,
          input: { orderId: order.id, total },
        }),
      });
      result.pushcut = response.ok ? "sent" : "failed";
    } catch {
      result.pushcut = "failed";
    }
  }

  return result;
}
