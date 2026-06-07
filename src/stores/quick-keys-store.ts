import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_QUICK_KEYS = 12;

export interface QuickKeyProduct {
  productId: string;
  productName: string;
  brand?: string;
  sku: string;
  unitPrice: number;     // default selling price
  packSizeCode?: string; // optional pack size identifier
  imageUrl?: string;
  position: number;      // 0..MAX_QUICK_KEYS-1
}

interface QuickKeysState {
  keys: QuickKeyProduct[];
  addKey: (key: Omit<QuickKeyProduct, 'position'>) => boolean;
  removeKey: (productId: string, packSizeCode?: string) => void;
  reorderKeys: (from: number, to: number) => void;
  updateKey: (productId: string, packSizeCode: string | undefined, patch: Partial<QuickKeyProduct>) => void;
  clear: () => void;
  isFull: () => boolean;
}

function keyOf(productId: string, packSizeCode?: string): string {
  return packSizeCode ? `${productId}::${packSizeCode}` : productId;
}

export const useQuickKeysStore = create<QuickKeysState>()(
  persist(
    (set, get) => ({
      keys: [],

      addKey: (key) => {
        const existing = get().keys.find(
          (k) => keyOf(k.productId, k.packSizeCode) === keyOf(key.productId, key.packSizeCode),
        );
        if (existing) {
          return false; // already present
        }
        if (get().keys.length >= MAX_QUICK_KEYS) {
          return false;
        }
        const position = get().keys.length;
        set({ keys: [...get().keys, { ...key, position }] });
        return true;
      },

      removeKey: (productId, packSizeCode) => {
        const id = keyOf(productId, packSizeCode);
        set({
          keys: get()
            .keys.filter((k) => keyOf(k.productId, k.packSizeCode) !== id)
            .map((k, i) => ({ ...k, position: i })),
        });
      },

      reorderKeys: (from, to) => {
        const keys = [...get().keys];
        const [moved] = keys.splice(from, 1);
        keys.splice(to, 0, moved);
        set({ keys: keys.map((k, i) => ({ ...k, position: i })) });
      },

      updateKey: (productId, packSizeCode, patch) => {
        const id = keyOf(productId, packSizeCode);
        set({
          keys: get().keys.map((k) =>
            keyOf(k.productId, k.packSizeCode) === id ? { ...k, ...patch } : k,
          ),
        });
      },

      clear: () => set({ keys: [] }),

      isFull: () => get().keys.length >= MAX_QUICK_KEYS,
    }),
    {
      name: 'pos-quick-keys-storage',
      partialize: (state) => ({ keys: state.keys }),
    },
  ),
);

export { MAX_QUICK_KEYS };
