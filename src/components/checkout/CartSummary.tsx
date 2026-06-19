import { useState } from 'react';
import type { CartItem } from '../../stores/cart-store';

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  format: (amount: number) => string;
}

export const CartSummary = ({ items, subtotal, discount, total, format }: CartSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-gray-800/80 bg-primary-dark/50 backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        aria-label={isExpanded ? 'Collapse cart summary' : 'Expand cart summary'}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{items.length} {items.length === 1 ? 'Item' : 'Items'}</p>
            <p className="text-xs text-gray-400">Tap to {isExpanded ? 'collapse' : 'review'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{format(total)}</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            strokeWidth={2} 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div 
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-gray-800/50">
          {/* Items List */}
          <div className="max-h-[200px] overflow-y-auto px-4 py-2">
            {items.map((item) => (
              <div 
                key={`${item.productId}-${item.packSize?.code || 'default'}`}
                className="flex items-center justify-between py-2 border-b border-gray-800/30 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} × {format(item.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white ml-3">
                  {format(item.quantity * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="px-4 py-3 bg-primary-darker/50 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-medium">{format(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Discount</span>
                <span className="text-red-400 font-medium">-{format(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
              <span className="text-base font-semibold text-white">Total</span>
              <span className="text-xl font-bold text-accent-green">{format(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
