import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { unwrapArray } from '../../lib/unwrap-response';
import { Input } from '../ui/Input';
import { useCartStore } from '../../stores/cart-store';
import { useAlertReplacement } from '../../hooks/useAlertReplacement';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  sellingPrice: number;
  requiresPrescription: boolean;
  stockAvailable: number;
  packSizes?: PackSize[];
  matchedPackSize?: PackSize;
}

interface PackSize {
  code?: string;
  name: string;
  unit: string;
  quantityPerPack: number;
  sellingPrice: number;
  barcode?: string;
}

type ProductResponse = Partial<Product> & {
  price?: number;
  stock?: number;
  suggestedRetailPrice?: number;
  basePrice?: number;
};

interface ProductSearchProps {
  branchId: string;
}

const getDisplayBrand = (brand?: string) => {
  const trimmed = brand?.trim();
  return trimmed && trimmed.toLowerCase() !== 'unknown' ? trimmed : null;
};

export const ProductSearch = ({ branchId }: ProductSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const { alertWarning, alertError } = useAlertReplacement();
  const { format } = useCurrency();

  const normalizeProduct = (product: ProductResponse): Product => ({
    _id: product._id || '',
    name: product.name || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    category: product.category || '',
    brand: product.brand || '',
    unit: product.unit || 'unit',
    sellingPrice:
      product.sellingPrice ??
      product.price ??
      product.suggestedRetailPrice ??
      product.basePrice ??
      0,
    requiresPrescription: Boolean(product.requiresPrescription),
    stockAvailable: product.stockAvailable ?? product.stock ?? 0,
    packSizes: product.packSizes || [],
    matchedPackSize: product.matchedPackSize,
  });

  const handleProductSelect = useCallback((product: Product, packSize?: PackSize) => {
    if (product.stockAvailable <= 0) {
      alertWarning('Product is out of stock');
      return;
    }

    const selectedPrice = packSize?.sellingPrice ?? product.sellingPrice;
    const quantityPerPack = packSize?.quantityPerPack ?? 1;

    addItem({
      productId: product._id,
      productName: packSize ? `${product.name} (${packSize.name})` : product.name,
      brand: product.brand,
      sku: product.sku,
      barcode: packSize?.barcode || product.barcode,
      quantity: 1,
      unitPrice: selectedPrice,
      requiresPrescription: product.requiresPrescription,
      baseUnit: product.unit || 'unit',
      quantityInBaseUnits: quantityPerPack,
      packSize,
    });

    setSearchQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  }, [addItem, alertWarning]);

  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    try {
      const response = await apiClient.get('/products/search', {
        params: { query: barcode, branchId },
      });

      if (response.data && response.data.length > 0) {
        const product = normalizeProduct(response.data[0]);
        handleProductSelect(product, product.matchedPackSize);
      } else {
        alertWarning('Product not found');
      }
    } catch {
      alertError('Error searching for product');
    }
  }, [branchId, handleProductSelect, alertWarning, alertError]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: queryKeys.products.list({
      branchId,
      search: searchQuery,
    }),
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await apiClient.get('/products/search', {
        params: { query: searchQuery, branchId },
      });
      return unwrapArray<ProductResponse>(response.data).map(normalizeProduct);
    },
    enabled: searchQuery.length >= 2,
  });

  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout: ReturnType<typeof setTimeout>;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isScannerActive && document.activeElement !== inputRef.current) {
        return;
      }

      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        handleBarcodeScanned(barcodeBuffer);
        barcodeBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(barcodeTimeout);
    };
  }, [isScannerActive, handleBarcodeScanned]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by name, brand, SKU, or barcode..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pr-24"
        />

        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerActive(!isScannerActive)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
            isScannerActive
              ? 'bg-accent-green text-primary-dark shadow-lg shadow-accent-green/40'
              : 'bg-primary-darker text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
          title={isScannerActive ? 'Scanner Active' : 'Activate Scanner'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </button>
      </div>

      {showResults && searchQuery.length >= 2 && (
        <div className="absolute z-10 w-full mt-2 bg-primary-dark border border-gray-700 rounded-xl shadow-2xl shadow-black/40 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-gray-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full mb-3" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <ul>
              {searchResults.map((product: Product) => (
                <li key={product._id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!product.packSizes?.length) {
                        handleProductSelect(product);
                      }
                    }}
                    className={`w-full px-4 py-3 text-left transition-all border-b border-gray-700 last:border-b-0 ${
                      product.stockAvailable <= 0
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:bg-primary-darker hover:border-accent-green/30'
                    }`}
                    disabled={product.stockAvailable <= 0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm leading-snug whitespace-normal break-words">{product.name}</p>
                        {getDisplayBrand(product.brand) && (
                          <p className="mt-1 inline-flex rounded-md bg-accent-green/10 px-2 py-1 text-xs font-semibold text-accent-green">
                            Brand: {getDisplayBrand(product.brand)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          SKU: {product.sku} - {product.barcode}
                        </p>
                        {product.packSizes && product.packSizes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleProductSelect(product);
                              }}
                              className="rounded-lg border border-gray-600 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:border-accent-green hover:text-accent-green"
                            >
                              {product.unit || 'Unit'} - {format(product.sellingPrice)}
                            </button>
                            {product.packSizes.map((pack) => {
                              const disabled = product.stockAvailable < pack.quantityPerPack;
                              return (
                              <button
                                key={`${pack.unit}-${pack.name}`}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (disabled) return;
                                  handleProductSelect(product, pack);
                                }}
                                disabled={disabled}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                  disabled
                                    ? 'cursor-not-allowed border-gray-700 text-gray-500'
                                    : 'border-accent-green/30 bg-accent-green/10 text-accent-green hover:bg-accent-green hover:text-primary-dark'
                                }`}
                              >
                                {pack.name} - {format(pack.sellingPrice)}
                                {disabled ? ' (low stock)' : ''}
                              </button>
                            )})}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-base font-bold text-accent-green">
                          {format(product.sellingPrice)}
                        </p>
                        <p
                          className={`text-xs mt-1 font-medium ${
                            product.stockAvailable > 0
                              ? 'text-gray-400'
                              : 'text-red-500'
                          }`}
                        >
                          {product.stockAvailable > 0
                            ? `${product.stockAvailable} in stock`
                            : 'Out of stock'}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm font-medium">No products found</p>
            </div>
          )}
        </div>
      )}

      {isScannerActive && (
        <div className="mt-2 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg animate-pulse">
          <p className="text-xs text-accent-green text-center font-medium">
            Scanner Active - Ready to scan or search
          </p>
        </div>
      )}
    </div>
  );
};
