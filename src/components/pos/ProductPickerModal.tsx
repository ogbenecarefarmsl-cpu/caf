import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuickKeysStore, MAX_QUICK_KEYS } from '../../stores/quick-keys-store';
import { useToast } from '../../hooks/useToast';

interface ProductPickerModalProps {
  open: boolean;
  onClose: () => void;
  branchId: string | undefined;
}

interface PickerProduct {
  _id: string;
  name: string;
  brand?: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl?: string;
  packSizes?: { code?: string; name: string; sellingPrice: number; quantityPerPack: number }[];
}

export const ProductPickerModal = ({ open, onClose, branchId }: ProductPickerModalProps) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const { showSuccess, showError } = useToast();
  const addKey = useQuickKeysStore((s) => s.addKey);
  const keysCount = useQuickKeysStore((s) => s.keys.length);
  const isFull = keysCount >= MAX_QUICK_KEYS;

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['quick-key-picker', debouncedSearch, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (branchId) params.set('branchId', branchId);
      params.set('limit', '30');
      const res = await apiClient.get<PickerProduct[]>(`/products?${params}`);
      return res.data;
    },
    enabled: open,
  });

  if (!open) return null;

  const handleAdd = (p: PickerProduct, packCode?: string) => {
    if (isFull) {
      showError(`Max ${MAX_QUICK_KEYS} quick keys`);
      return;
    }
    const ok = addKey({
      productId: p._id,
      productName: packCode
        ? `${p.name} (${p.packSizes?.find((pk) => pk.code === packCode)?.name ?? 'pack'})`
        : p.name,
      brand: p.brand,
      sku: p.sku,
      unitPrice: packCode
        ? p.packSizes?.find((pk) => pk.code === packCode)?.sellingPrice ?? p.price
        : p.price,
      packSizeCode: packCode,
      imageUrl: p.imageUrl,
    });
    if (ok) {
      showSuccess(`Added "${p.name}" to quick keys`);
    } else {
      showError(`"${p.name}" is already a quick key`);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-primary-dark border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Add Quick Key</h3>
            <p className="text-xs text-gray-400">
              {keysCount}/{MAX_QUICK_KEYS} slots used
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-800">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, brand, SKU..."
            className="w-full px-4 py-2 bg-primary-darker border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-green"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
          ) : !products || products.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              {debouncedSearch ? 'No products found' : 'Start typing to search products'}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const hasPacks = p.packSizes && p.packSizes.length > 0;
                return (
                  <div
                    key={p._id}
                    className="flex items-center justify-between gap-3 p-3 bg-primary-darker border border-gray-800 rounded-lg hover:border-accent-green/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {p.brand ? `${p.brand} · ` : ''}SKU {p.sku} · {p.stock} in stock
                      </p>
                      {!hasPacks && (
                        <p className="text-xs text-accent-green font-bold mt-0.5">
                          Le {p.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    {hasPacks ? (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleAdd(p)}
                          disabled={isFull}
                          className="px-3 py-1 text-xs bg-accent-green text-primary-dark rounded-md font-semibold hover:bg-accent-light disabled:opacity-50"
                        >
                          + Base
                        </button>
                        {p.packSizes!.map((pk) => (
                          <button
                            key={pk.code ?? pk.name}
                            onClick={() => handleAdd(p, pk.code)}
                            disabled={isFull}
                            className="px-3 py-1 text-xs bg-primary-dark border border-accent-green/30 text-accent-green rounded-md font-semibold hover:bg-accent-green/10 disabled:opacity-50"
                            title={`Le ${pk.sellingPrice.toFixed(2)}`}
                          >
                            + {pk.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdd(p)}
                        disabled={isFull}
                        className="px-4 py-2 text-sm bg-accent-green text-primary-dark rounded-lg font-semibold hover:bg-accent-light disabled:opacity-50 shrink-0"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
