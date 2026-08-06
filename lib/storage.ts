import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

import type { Order, Product, Settings } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const files = {
  products: path.join(dataDirectory, "products.json"),
  orders: path.join(dataDirectory, "orders.json"),
  settings: path.join(dataDirectory, "settings.json"),
};

// Netlify Functions have an ephemeral, read-only project filesystem. Keep the
// local JSON files for development, but use a site-wide Blobs store in a
// deployed Netlify runtime so changes survive function restarts and deploys.
const blobStoreName = "kngstores-data";
// Netlify exposes this context inside Functions at runtime. `NETLIFY` is a
// build-time flag and is not guaranteed to be available once a Function runs.
const isNetlifyRuntime = Boolean(process.env.NETLIFY_BLOBS_CONTEXT);

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
  if (isNetlifyRuntime) {
    const key = path.basename(file);
    const store = getStore(blobStoreName);
    const stored = await store.get(key, { type: "json" });

    if (stored !== null) {
      return stored as T;
    }

    // Preserve the starter data that ships with the application on the first
    // production read. Subsequent reads come from the persistent Blob.
    try {
      const content = await fs.readFile(file, "utf8");
      const initialData = JSON.parse(content) as T;
      await store.setJSON(key, initialData);
      return initialData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }

      await store.setJSON(key, fallback);
      return fallback;
    }
  }

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
  if (isNetlifyRuntime) {
    await getStore(blobStoreName).setJSON(path.basename(file), data);
    return;
  }

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
