export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type OrderStatus = "confirmed" | "processing" | "completed" | "cancelled";

export type Order = {
  id: string;
  customerToken: string;
  buyer: {
    name: string;
    instagram: string;
    /** Preserva leitura de pedidos antigos que ainda possuam e-mail. */
    email?: string;
    phone?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  store: {
    name: string;
    description: string;
    supportEmail: string;
    currency: "BRL";
  };
  /** Empty means the ADMIN_PASSWORD environment variable is used. */
  adminPassword: string;
  notifications: {
    notifyOnNewOrder: boolean;
    discordWebhookUrl: string;
    pushcutUrl: string;
    pushcutApiKey: string;
  };
};

export type SafeSettings = Omit<Settings, "adminPassword"> & {
  hasAdminPassword: boolean;
};
