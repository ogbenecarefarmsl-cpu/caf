import Dexie, { type Table } from 'dexie';

/**
 * Payment method types supported
 */
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'orange_money'
  | 'africell_money'
  | 'qmoney'
  | 'bank_transfer';

// --- Queued Sales (for offline checkout) ------------------------
export interface QueuedSale {
  id?: number;
  branchId: string;
  shiftId: string;
  terminalId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  prescriptionUrl?: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// --- Cached Products (for offline browsing) --------------------
export interface CachedProduct {
  _id: string;
  branchId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  basePrice: number;
  costPrice: number;
  suggestedRetailPrice?: number;
  requiresPrescription: boolean;
  isActive: boolean;
  imageUrl?: string;
  localImage?: string; // base64 data URL for local images
  stock: number;
  packSizes?: Array<{
    code?: string;
    name: string;
    unit: string;
    quantityPerPack: number;
    sellingPrice: number;
    barcode?: string;
  }>;
  syncedAt: number;
}

// --- Cached Batches (for offline FEFO) -------------------------
export interface CachedBatch {
  _id: string;
  productId: string;
  branchId: string;
  lotNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  sellingPrice: number;
  purchasePrice: number;
  isExpired: boolean;
  isDepleted: boolean;
  syncedAt: number;
}

// --- Cached Customers (for offline lookup) ---------------------
export interface CachedCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  loyaltyPoints: number;
  syncedAt: number;
}

// --- Cached Branches -------------------------------------------
export interface CachedBranch {
  _id: string;
  name: string;
  code: string;
  isHeadquarters: boolean;
  syncedAt: number;
}

// --- Product Images (local camera captures) --------------------
export interface ProductImage {
  id?: number;
  productId: string;
  imageData: string; // base64 data URL
  capturedAt: number;
  synced: boolean;
  syncedAt?: number;
}

// --- Sync Metadata ---------------------------------------------
export interface SyncMeta {
  key: string;
  lastSync: number;
}

export class OfflineDatabase extends Dexie {
  queuedSales!: Table<QueuedSale, number>;
  products!: Table<CachedProduct, string>;
  batches!: Table<CachedBatch, string>;
  customers!: Table<CachedCustomer, string>;
  branches!: Table<CachedBranch, string>;
  productImages!: Table<ProductImage, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('PharmacyPOSOffline');

    // Version 1: Initial schema
    this.version(1).stores({
      queuedSales: '++id, timestamp, branchId, shiftId',
    });

    // Version 2: Add payment method index
    this.version(2).stores({
      queuedSales: '++id, timestamp, branchId, shiftId, paymentMethod',
    });

    // Version 3: Add offline data tables
    this.version(3).stores({
      queuedSales: '++id, timestamp, branchId, shiftId, paymentMethod',
      products: '_id, branchId, sku, barcode, category, name, syncedAt',
      batches: '_id, productId, branchId, expiryDate, syncedAt',
      customers: '_id, phone, email, syncedAt',
      branches: '_id, code, syncedAt',
      productImages: '++id, productId, synced, capturedAt',
      syncMeta: 'key, lastSync',
    });
  }
}

export const offlineDb = new OfflineDatabase();

// --- Sync helpers ----------------------------------------------

export async function getLastSync(key: string): Promise<number> {
  const meta = await offlineDb.syncMeta.get(key);
  return meta?.lastSync ?? 0;
}

export async function setLastSync(key: string): Promise<void> {
  await offlineDb.syncMeta.put({ key, lastSync: Date.now() });
}

export async function isStale(key: string, maxAgeMs: number): Promise<boolean> {
  const last = await getLastSync(key);
  return Date.now() - last > maxAgeMs;
}
