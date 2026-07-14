import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api-client';
import { unwrapArray } from '../../lib/unwrap-response';
import { useCartStore } from '../../stores/cart-store';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { Error } from '../../components/ui/Error';
import { queryKeys } from '../../lib/query-keys';
import { useCurrency } from '../../hooks/useCurrency';
import { useDebounce } from '../../hooks/useDebounce';

interface Promotion {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  scope: 'entire_transaction' | 'specific_item' | 'category';
  value: number;
  minimumPurchase?: number;
  isActive: boolean;
}

export const DiscountsPage = () => {
  const navigate = useNavigate();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const { items, subtotal, manualDiscount: storedManualDiscount, promotionId, setPromotion } = useCartStore();
  const { format } = useCurrency();
  
  const [selectedPromotion, setSelectedPromotion] = useState<string | undefined>(promotionId);
  const [percentageDiscount, setPercentageDiscount] = useState('');
  const [fixedDiscount, setFixedDiscount] = useState(
    storedManualDiscount > 0 ? String(storedManualDiscount) : '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const requestedManualDiscount = Math.min(
    subtotal,
    Math.max(0, Number(fixedDiscount) || 0) +
      subtotal * Math.min(100, Math.max(0, Number(percentageDiscount) || 0)) / 100,
  );
  const debouncedManualDiscount = useDebounce(requestedManualDiscount, 250);

  const { data: promotions, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.promotions.list({ isActive: true, branchId: getBranchId(selectedBranch) }),
    queryFn: async () => {
      const response = await apiClient.get('/promotions/active', {
        params: { branchId: getBranchId(selectedBranch) },
      });
      return unwrapArray<Promotion>(response.data);
    },
    enabled: !!getBranchId(selectedBranch),
  });

  const { data: quote, isFetching: isCalculating } = useQuery({
    queryKey: ['checkout-quote', getBranchId(selectedBranch), selectedPromotion, debouncedManualDiscount, items],
    queryFn: async () => {
      const response = await apiClient.post('/sales/quote', {
        branchId: getBranchId(selectedBranch),
        promotionId: selectedPromotion,
        discount: debouncedManualDiscount,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          packSize: item.packSize,
          quantityInBaseUnits: item.quantityInBaseUnits,
        })),
      });
      return response.data as {
        subtotal: number;
        discount: number;
        manualDiscount: number;
        taxAmount: number;
        total: number;
      };
    },
    enabled: Boolean(
      getBranchId(selectedBranch) &&
      items.length &&
      (selectedPromotion || debouncedManualDiscount > 0),
    ),
  });

  const totalDiscount = quote?.discount ?? 0;
  const newTotal = quote?.total ?? subtotal;

  const togglePromotion = (promoId: string) => {
    setSelectedPromotion((current) => current === promoId ? undefined : promoId);
  };

  const handleApplyDiscount = () => {
    setPromotion(selectedPromotion, totalDiscount, quote?.manualDiscount ?? 0);
    navigate('/pos');
  };

  const filteredPromotions = promotions?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-primary-darker flex flex-col pt-safe-top">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-white flex items-center min-w-11 min-h-11 justify-center -ml-2 rounded-lg hover:bg-white/5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Discounts & Promotions</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <h2 className="text-white font-semibold mb-3">Staff Discount</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="block text-sm text-gray-400">Percentage</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={percentageDiscount}
                  onChange={(event) => setPercentageDiscount(event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-700 bg-primary-dark px-4 py-3 pr-10 text-white focus:border-accent-green focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </label>
            <label className="space-y-2">
              <span className="block text-sm text-gray-400">Fixed amount</span>
              <input
                type="number"
                min="0"
                value={fixedDiscount}
                onChange={(event) => setFixedDiscount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-700 bg-primary-dark px-4 py-3 text-white focus:border-accent-green focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Promotions */}
        <div>
          <h2 className="text-white font-semibold mb-3">Select a Promotion</h2>
          
          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search promotions..."
              className="w-full pl-12 pr-4 py-3 bg-primary-dark border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Promotion List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400">Loading...</div>
            ) : error ? (
              <Error message="Failed to load promotions" onRetry={() => refetch()} />
            ) : filteredPromotions && filteredPromotions.length > 0 ? (
              filteredPromotions.map((promo) => (
                <button
                  key={promo._id}
                  onClick={() => togglePromotion(promo._id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    selectedPromotion === promo._id
                      ? 'bg-blue-500/10 border-blue-500'
                      : 'bg-primary-dark border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-white font-semibold">{promo.name}</p>
                    <p className="text-gray-400 text-sm">{promo.description}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPromotion === promo._id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-500'
                    }`}
                  >
                    {selectedPromotion === promo._id && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">No promotions available</div>
            )}
          </div>
        </div>
      </div>

      {/* Summary & Apply */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">{format(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Discount</span>
            <span className="text-red-400">{isCalculating ? 'Calculating…' : `-${format(totalDiscount)}`}</span>
          </div>
          {(quote?.taxAmount ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tax</span>
              <span className="text-white">{format(quote?.taxAmount ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
            <span className="text-white">New Total</span>
            <span className="text-white">{format(newTotal)}</span>
          </div>
        </div>

        <button
          onClick={handleApplyDiscount}
          disabled={isCalculating || Boolean((selectedPromotion || debouncedManualDiscount > 0) && !quote)}
          className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
        >
          {selectedPromotion || debouncedManualDiscount > 0 ? 'Apply Discount' : 'Clear Discount'}
        </button>
      </div>
    </div>
  );
};
