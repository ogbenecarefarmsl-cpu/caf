import { useCartStore, itemKey } from '../../stores/cart-store';
import { useCurrency } from '../../hooks/useCurrency';
import { Button } from '../ui/Button';

interface ShoppingCartProps {
  onCheckout: () => void;
}

export const ShoppingCart = ({ onCheckout }: ShoppingCartProps) => {
  const { items, subtotal, discount, total, updateQuantity, removeItem } = useCartStore();
  const { format } = useCurrency();

  const handleQuantityChange = (productId: string, packSize: typeof items[number]['packSize'], newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity > 0) {
      updateQuantity(productId, quantity, packSize);
    }
  };

  const handleQuantityIncrement = (productId: string, packSize: typeof items[number]['packSize'], currentQuantity: number) => {
    updateQuantity(productId, currentQuantity + 1, packSize);
  };

  const handleQuantityDecrement = (productId: string, packSize: typeof items[number]['packSize'], currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(productId, currentQuantity - 1, packSize);
    }
  };

  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">
          Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h2>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-center">Your cart is empty</p>
            <p className="text-sm text-center mt-2">
              Search for products to add them to your cart
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={itemKey(item.productId, item.packSize)}
                className="bg-[--color-primary-darker] rounded-lg p-3 border border-gray-700"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white leading-snug whitespace-normal break-words">{item.productName}</h3>
                    {item.brand && item.brand.trim().toLowerCase() !== 'unknown' && (
                      <p className="text-xs text-accent-green mt-0.5 whitespace-normal break-words">
                        Brand: {item.brand}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      SKU: {item.sku}
                      {item.packSize && (
                        <span className="ml-1 px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[10px]">
                          {item.packSize.name}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.packSize)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="Remove item"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Quantity Controls and Price */}
                <div className="flex items-center justify-between">
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityDecrement(item.productId, item.packSize, item.quantity)}
                      className="w-10 h-10 flex items-center justify-center bg-[--color-primary-dark] text-white rounded-lg hover:bg-gray-700 transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      </svg>
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.productId, item.packSize, e.target.value)}
                      className="w-16 px-2 py-1 text-center bg-[--color-primary-dark] text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--color-accent-green]"
                    />

                    <button
                      onClick={() => handleQuantityIncrement(item.productId, item.packSize, item.quantity)}
                      className="w-10 h-10 flex items-center justify-center bg-[--color-primary-dark] text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {format(item.unitPrice)} each
                    </p>
                    <p className="text-lg font-bold text-[--color-accent-green]">
                      {format(item.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {hasItems && (
        <div className="border-t border-gray-700 px-4 py-4 bg-[--color-primary-darker]">

          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal:</span>
              <span className="text-white font-medium">{format(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount:</span>
                <span className="text-red-400 font-medium">-{format(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
              <span className="text-white">Total:</span>
              <span className="text-[--color-accent-green]">{format(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={onCheckout}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Proceed to Checkout
          </Button>
        </div>
      )}
    </div>
  );
};
