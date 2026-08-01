import { promises as fs } from "fs";
import path from "path";

import type { Order, Product, Settings } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const files = {
  products: path.join(dataDirectory, "products.json"),
  orders: path.join(dataDirectory, "orders.json"),
  settings: path.join(dataDirectory, "settings.json"),
};

const defaultSettings: Settings = {
  store: {
    name: "Vento",
    description: "Produtos digitais e experiências que acompanham seu ritmo.",
    supportEmail: "suporte@exemplo.com",
    currency: "BRL",
  },
  adminPassword: "",
  notifications: {
    notifyOnNewOrder: true,
    discordWebhookUrl: "",
    pushcutUrl: "",
    pushcutApiKey: "",
  },
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(file, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(dataDirectory, { recursive: true });
      await writeJson(file, fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeJson<T>(file: string, data: T) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${file}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, file);
}

export async function getProducts() {
  return readJson<Product[]>(files.products, []);
}

export async function saveProducts(products: Product[]) {
  return writeJson(files.products, products);
}

export async function getOrders() {
  return readJson<Order[]>(files.orders, []);
}

export async function saveOrders(orders: Order[]) {
  return writeJson(files.orders, orders);
}

export async function getSettings() {
  const settings = await readJson<Partial<Settings>>(files.settings, defaultSettings);
  return {
    ...defaultSettings,
    ...settings,
    store: { ...defaultSettings.store, ...settings.store },
    notifications: {
      ...defaultSettings.notifications,
      ...settings.notifications,
      // JSON has precedence after an administrator saves a value in the panel.
      // Environment variables make first-time local/production setup convenient.
      discordWebhookUrl: settings.notifications?.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL || "",
      pushcutUrl: settings.notifications?.pushcutUrl || process.env.PUSHCUT_URL || "",
      pushcutApiKey: settings.notifications?.pushcutApiKey || process.env.PUSHCUT_API_KEY || "",
    },
  } satisfies Settings;
}

export async function saveSettings(settings: Settings) {
  return writeJson(files.settings, settings);
}
