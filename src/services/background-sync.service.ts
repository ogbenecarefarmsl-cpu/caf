import { offlineDb, getLastSync, setLastSync, isStale, type CachedProduct, type CachedBatch, type CachedCustomer, type CachedBranch, type ProductImage } from '../lib/offline-db';
import apiClient from '../lib/api-client';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 10 * 60 * 1000; // Consider data stale after 10 minutes

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncingData = false;

/**
 * Sync products from server to local IndexedDB
 */
async function syncProducts(branchId: string): Promise<void> {
  try {
    const response = await apiClient.get('/products', {
      params: { branchId, limit: 500 },
    });
    const products = response.data?.data ?? response.data;
    if (!Array.isArray(products)) return;

    const cached: CachedProduct[] = products.map((p: any) => ({
      _id: p._id,
      branchId: p.branchId,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category || '',
      brand: p.brand || '',
      unit: p.unit || '',
      basePrice: p.basePrice || 0,
      costPrice: p.costPrice || 0,
      requiresPrescription: p.requiresPrescription || false,
      isActive: p.isActive !== false,
      imageUrl: p.imageUrl,
      stock: p.stock || 0,
      syncedAt: Date.now(),
    }));

    await offlineDb.products.bulkPut(cached);
    await setLastSync('products');
    console.log(`[BackgroundSync] Synced ${cached.length} products`);
  } catch (error) {
    console.warn('[BackgroundSync] Failed to sync products:', error);
  }
}

/**
 * Sync batches from server to local IndexedDB
 */
async function syncBatches(branchId: string): Promise<void> {
  try {
    const response = await apiClient.get('/batches', {
      params: { branchId, limit: 1000 },
    });
    const batches = response.data?.data ?? response.data;
    if (!Array.isArray(batches)) return;

    const cached: CachedBatch[] = batches.map((b: any) => ({
      _id: b._id,
      productId: b.productId?._id || b.productId,
      branchId: b.branchId?._id || b.branchId,
      lotNumber: b.lotNumber || '',
      expiryDate: b.expiryDate || '',
      quantityAvailable: b.quantityAvailable || 0,
      sellingPrice: b.sellingPrice || 0,
      purchasePrice: b.purchasePrice || 0,
      isExpired: b.isExpired || false,
      isDepleted: b.isDepleted || false,
      syncedAt: Date.now(),
    }));

    await offlineDb.batches.bulkPut(cached);
    await setLastSync('batches');
    console.log(`[BackgroundSync] Synced ${cached.length} batches`);
  } catch (error) {
    console.warn('[BackgroundSync] Failed to sync batches:', error);
  }
}

/**
 * Sync customers from server to local IndexedDB
 */
async function syncCustomers(): Promise<void> {
  try {
    const response = await apiClient.get('/customers', {
      params: { limit: 500 },
    });
    const customers = response.data?.data ?? response.data;
    if (!Array.isArray(customers)) return;

    const cached: CachedCustomer[] = customers.map((c: any) => ({
      _id: c._id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      phone: c.phone,
      email: c.email,
      loyaltyPoints: c.loyaltyPoints || 0,
      syncedAt: Date.now(),
    }));

    await offlineDb.customers.bulkPut(cached);
    await setLastSync('customers');
    console.log(`[BackgroundSync] Synced ${cached.length} customers`);
  } catch (error) {
    console.warn('[BackgroundSync] Failed to sync customers:', error);
  }
}

/**
 * Sync branches from server to local IndexedDB
 */
async function syncBranches(): Promise<void> {
  try {
    const response = await apiClient.get('/branches');
    const branches = response.data?.data ?? response.data;
    if (!Array.isArray(branches)) return;

    const cached: CachedBranch[] = branches.map((b: any) => ({
      _id: b._id,
      name: b.name,
      code: b.code,
      isHeadquarters: b.isHeadquarters || false,
      syncedAt: Date.now(),
    }));

    await offlineDb.branches.bulkPut(cached);
    await setLastSync('branches');
    console.log(`[BackgroundSync] Synced ${cached.length} branches`);
  } catch (error) {
    console.warn('[BackgroundSync] Failed to sync branches:', error);
  }
}

/**
 * Full sync: download fresh data from server
 */
export async function fullSync(branchId?: string): Promise<void> {
  if (isSyncingData) return;
  isSyncingData = true;

  try {
    const branch = branchId || localStorage.getItem('lastBranchId') || '';
    await Promise.all([
      syncBranches(),
      branch ? syncProducts(branch) : Promise.resolve(),
      branch ? syncBatches(branch) : Promise.resolve(),
      syncCustomers(),
    ]);
    console.log('[BackgroundSync] Full sync complete');
  } finally {
    isSyncingData = false;
  }
}

/**
 * Quick sync: only fetch data that's stale
 */
export async function quickSync(branchId?: string): Promise<void> {
  if (isSyncingData) return;
  isSyncingData = true;

  try {
    const branch = branchId || localStorage.getItem('lastBranchId') || '';
    const tasks: Promise<void>[] = [];

    if (await isStale('branches', STALE_THRESHOLD)) {
      tasks.push(syncBranches());
    }
    if (branch && await isStale('products', STALE_THRESHOLD)) {
      tasks.push(syncProducts(branch));
    }
    if (branch && await isStale('batches', STALE_THRESHOLD)) {
      tasks.push(syncBatches(branch));
    }
    if (await isStale('customers', STALE_THRESHOLD)) {
      tasks.push(syncCustomers());
    }

    await Promise.all(tasks);
  } finally {
    isSyncingData = false;
  }
}

/**
 * Start periodic background sync
 */
export function startPeriodicSync(branchId?: string): void {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  // Initial sync
  fullSync(branchId);

  // Periodic sync
  syncTimer = setInterval(() => {
    if (navigator.onLine) {
      quickSync(branchId);
    }
  }, SYNC_INTERVAL);

  // Sync when coming back online
  window.addEventListener('online', () => {
    quickSync(branchId);
  });

  console.log('[BackgroundSync] Periodic sync started');
}

/**
 * Stop periodic background sync
 */
export function stopPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  console.log('[BackgroundSync] Periodic sync stopped');
}

/**
 * Get cached products for offline use
 */
export async function getCachedProducts(branchId: string): Promise<CachedProduct[]> {
  return offlineDb.products
    .where('branchId')
    .equals(branchId)
    .and(p => p.isActive)
    .toArray();
}

/**
 * Get cached batches for offline FEFO
 */
export async function getCachedBatches(branchId: string, productId: string): Promise<CachedBatch[]> {
  return offlineDb.batches
    .where('branchId')
    .equals(branchId)
    .and(b => b.productId === productId && !b.isExpired && !b.isDepleted && b.quantityAvailable > 0)
    .sortBy('expiryDate')
    .then(batches => batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()));
}

/**
 * Get cached customers for offline lookup
 */
export async function getCachedCustomers(search?: string): Promise<CachedCustomer[]> {
  const customers = await offlineDb.customers.toArray();
  if (!search) return customers;

  const lower = search.toLowerCase();
  return customers.filter(c =>
    c.firstName.toLowerCase().includes(lower) ||
    c.lastName.toLowerCase().includes(lower) ||
    c.phone?.includes(search)
  );
}

/**
 * Save a product image locally
 */
export async function saveProductImage(productId: string, imageData: string): Promise<void> {
  await offlineDb.productImages.add({
    productId,
    imageData,
    capturedAt: Date.now(),
    synced: false,
  });

  // Also update the cached product with local image
  await offlineDb.products.update(productId, { localImage: imageData });
}

/**
 * Get local image for a product
 */
export async function getProductImage(productId: string): Promise<string | undefined> {
  const product = await offlineDb.products.get(productId);
  if (product?.localImage) return product.localImage;

  const image = await offlineDb.productImages
    .where('productId')
    .equals(productId)
    .reverse()
    .first();

  return image?.imageData;
}
