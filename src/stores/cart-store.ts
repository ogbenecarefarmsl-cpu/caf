import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PackSize {
  name: string;           // "Box", "Strip", "Tablet"
  unit: string;           // "box", "strip", "tablet"
  quantityPerPack: number; // 100, 10, 1
  sellingPrice: number;   // Price per pack
  barcode?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;       // Quantity in selected pack units
  unitPrice: number;      // Price per selected pack unit
  subtotal: number;
  requiresPrescription: boolean;

  // Pack size info (for unit conversion)
  packSize?: PackSize;    // Selected pack size (undefined = base unit)
  baseUnit: string;       // Base unit name: "tablet", "capsule"
  quantityInBaseUnits: number; // Actual quantity deducted from stock
}

interface CartState {
  items: CartItem[];
  discount: number;
  prescriptionUrl?: string;

  // Computed values
  subtotal: number;
  total: number;

  // Actions
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  removeItem: (productId: string, packSizeUnit?: string) => void;
  updateQuantity: (productId: string, quantity: number, packSizeUnit?: string) => void;
  updateItemPrice: (productId: string, unitPrice: number, packSizeUnit?: string) => void;
  setDiscount: (discount: number) => void;
  setPrescription: (url: string) => void;
  clearCart: () => void;
  calculateTotals: () => void;
}

/**
 * Generate a unique key for cart items (productId + packSize)
 * This allows selling the same product in different pack sizes
 */
export function itemKey(productId: string, packSizeUnit?: string): string {
  return packSizeUnit ? `${productId}:${packSizeUnit}` : productId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      prescriptionUrl: undefined,
      subtotal: 0,
      total: 0,

  addItem: (item) => {
    const items = get().items;
    const key = itemKey(item.productId, item.packSize?.unit);
    const existingItem = items.find(
      (i) => itemKey(i.productId, i.packSize?.unit) === key
    );

    if (existingItem) {
      // Update quantity if same product + same pack size already in cart
      set({
        items: items.map((i) =>
          itemKey(i.productId, i.packSize?.unit) === key
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                subtotal: (i.quantity + item.quantity) * i.unitPrice,
                quantityInBaseUnits: i.quantityInBaseUnits + item.quantityInBaseUnits,
              }
            : i
        ),
      });
    } else {
      // Add new item (different product or different pack size)
      set({
        items: [
          ...items,
          {
            ...item,
            subtotal: item.quantity * item.unitPrice,
          },
        ],
      });
    }
    get().calculateTotals();
  },

  removeItem: (productId, packSizeUnit) => {
    const key = itemKey(productId, packSizeUnit);
    set({
      items: get().items.filter(
        (item) => itemKey(item.productId, item.packSize?.unit) !== key
      ),
    });
    get().calculateTotals();
  },

  updateQuantity: (productId, quantity, packSizeUnit) => {
    if (quantity <= 0) {
      get().removeItem(productId, packSizeUnit);
      return;
    }

    const key = itemKey(productId, packSizeUnit);
    set({
      items: get().items.map((item) => {
        if (itemKey(item.productId, item.packSize?.unit) !== key) return item;

        const quantityInBaseUnits = item.packSize
          ? quantity * item.packSize.quantityPerPack
          : quantity;

        return {
          ...item,
          quantity,
          subtotal: quantity * item.unitPrice,
          quantityInBaseUnits,
        };
      }),
    });
    get().calculateTotals();
  },

  updateItemPrice: (productId, unitPrice, packSizeUnit) => {
    const key = itemKey(productId, packSizeUnit);
    set({
      items: get().items.map((item) =>
        itemKey(item.productId, item.packSize?.unit) === key
          ? {
              ...item,
              unitPrice,
              subtotal: item.quantity * unitPrice,
            }
          : item
      ),
    });
    get().calculateTotals();
  },

  setDiscount: (discount) => {
    set({ discount });
    get().calculateTotals();
  },

  setPrescription: (url) => {
    set({ prescriptionUrl: url });
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      prescriptionUrl: undefined,
      subtotal: 0,
      total: 0,
    });
  },

  calculateTotals: () => {
    const items = get().items;
    const discount = get().discount;
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = Math.max(0, subtotal - discount);

    set({ subtotal, total });
  },
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
        prescriptionUrl: state.prescriptionUrl,
        subtotal: state.subtotal,
        total: state.total,
      }),
      onRehydrateStorage: () => (state) => {
        state?.calculateTotals();
      },
    },
  ),
);
