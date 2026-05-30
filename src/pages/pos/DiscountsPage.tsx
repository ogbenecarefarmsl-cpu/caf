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

type DiscountScope = 'entire';

export const DiscountsPage = () => {
  const navigate = useNavigate();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const { subtotal, setDiscount } = useCartStore();
  const { format, symbol } = useCurrency();
  
  const [discountScope] = useState<DiscountScope>('entire');
  const [percentageDiscount, setPercentageDiscount] = useState('');
  const [fixedDiscount, setFixedDiscount] = useState('');
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const calculateTotalDiscount = () => {
    let discount = 0;

    // Custom percentage discount (clamped to 0-100%)
    if (percentageDiscount) {
      const pct = Math.min(100, Math.max(0, parseFloat(percentageDiscount) || 0));
      discount += (subtotal * pct) / 100;
    }

    // Custom fixed discount
    if (fixedDiscount) {
      discount += parseFloat(fixedDiscount) || 0;
    }

    // Selected promotions
    selectedPromotions.forEach((promoId) => {
      const promo = promotions?.find((p) => p._id === promoId);
      if (promo) {
        if (promo.type === 'percentage') {
          discount += (subtotal * promo.value) / 100;
        } else if (promo.type === 'fixed_amount') {
          discount += promo.value;
        }
      }
    });

    return Math.min(discount, subtotal);
  };

  const totalDiscount = calculateTotalDiscount();
  const newTotal = subtotal - totalDiscount;

  const togglePromotion = (promoId: string) => {
    setSelectedPromotions((prev) =>
      prev.includes(promoId)
        ? prev.filter((id) => id !== promoId)
        : [...prev, promoId]
    );
  };

  const handleApplyDiscount = () => {
    setDiscount(totalDiscount);
    navigate('/pos');
  };

  const filteredPromotions = promotions?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-primary-darker flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-white flex items-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Discounts & Promotions</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Custom Discount */}
        <div>
          <h2 className="text-white font-semibold mb-3">Apply Custom Discount</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Percentage</label>
              <div className="relative">
                <input
                  type="number"
                  value={percentageDiscount}
                  onChange={(e) => setPercentageDiscount(e.target.value)}
                  placeholder="Enter percentage (e.g., 10)"
                  className="w-full px-4 py-3 bg-primary-dark border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Fixed Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={fixedDiscount}
                  onChange={(e) => setFixedDiscount(e.target.value)}
                  placeholder={`${symbol} 0.00`}
                  className="w-full px-4 py-3 bg-primary-dark border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{symbol}</span>
              </div>
            </div>
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
                    selectedPromotions.includes(promo._id)
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
                      selectedPromotions.includes(promo._id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-500'
                    }`}
                  >
                    {selectedPromotions.includes(promo._id) && (
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
            <span className="text-red-400">-{format(totalDiscount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
            <span className="text-white">New Total</span>
            <span className="text-white">{format(newTotal)}</span>
          </div>
        </div>

        <button
          onClick={handleApplyDiscount}
          className="w-full py-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
        >
          Apply Discount
        </button>
      </div>
    </div>
  );
};
