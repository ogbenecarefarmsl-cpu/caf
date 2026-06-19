import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCartStore } from '../../stores/cart-store';
import { useAlertReplacement } from '../../hooks/useAlertReplacement';
import apiClient from '../../lib/api-client';
import { PAYMENT_METHODS, isMobileMoneyMethod } from '../../config/payment-methods';
import { useCurrency } from '../../hooks/useCurrency';
import { getErrorMessage } from '../../lib/error-utils';

interface SaleData {
  _id: string;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  paymentMethod: string;
  createdAt: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saleData: SaleData) => void;
  branchId: string;
  shiftId: string;
  terminalId: string;
}

type PaymentMethod = 'cash' | 'card' | 'orange_money' | 'africell_money' | 'qmoney' | 'bank_transfer';

export const CheckoutModal = ({
  isOpen,
  onClose,
  onSuccess,
  branchId,
  shiftId,
  terminalId,
}: CheckoutModalProps) => {
  const { items, subtotal, discount, total, setDiscount } = useCartStore();
  const { alertError } = useAlertReplacement();
  const { format } = useCurrency();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [discountInput, setDiscountInput] = useState(discount.toString());

  const isMobileMoney = isMobileMoneyMethod(paymentMethod);

  interface CheckoutData {
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    discount: number;
    branchId: string;
    shiftId: string;
    terminalId: string;
    prescriptionUrl?: string;
  }

  // Process checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutData) => {
      const response = await apiClient.post('/sales/checkout', data);
      return response.data;
    },
    onSuccess: (data) => {
      onSuccess(data);
      onClose();
    },
    onError: (error: unknown) => {
      console.error('Checkout failed:', error);
      alertError(getErrorMessage(error, 'Checkout failed. Please try again.'));
    },
  });

  const handleDiscountChange = (value: string) => {
    setDiscountInput(value);
    const discountValue = parseFloat(value) || 0;
    setDiscount(Math.max(0, Math.min(discountValue, subtotal)));
  };

  const handleCheckout = async () => {
    if (items.length === 0 || total <= 0) {
      alertError('Cannot checkout with an empty cart or zero total.');
      return;
    }

    // Prepare checkout data
    const checkoutData = {
      branchId,
      shiftId,
      terminalId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        packSize: item.packSize?.unit || undefined,
        quantityInBaseUnits: item.quantityInBaseUnits,
      })),
      discount,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined, // Optional mobile money reference
    };

    checkoutMutation.mutate(checkoutData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Checkout" size="lg">
      <div className="space-y-6">
        {/* Order Summary */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Order Summary</h3>
          <div className="bg-primary-darker rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Items ({items.length}):</span>
              <span className="text-white">{format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Discount:</span>
              <span className="text-red-400">-{format(discount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
              <span className="text-white">Total:</span>
              <span className="text-accent-green">{format(total)}</span>
            </div>
          </div>
        </div>

        {/* Discount Input */}
        <div>
          <Input
            type="number"
            label="Discount Amount"
            placeholder="0.00"
            value={discountInput}
            onChange={(e) => handleDiscountChange(e.target.value)}
            min="0"
            max={subtotal}
            step="0.01"
          />
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(method.id as PaymentMethod);
                  // Clear payment reference when switching payment methods
                  if (!isMobileMoneyMethod(method.id)) {
                    setPaymentReference('');
                  }
                }}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[76px] sm:min-h-[88px] ${
                  paymentMethod === method.id
                    ? 'border-accent-green bg-accent-green/20'
                    : 'border-gray-600 bg-primary-darker hover:border-gray-500'
                }`}
                title={method.description}
              >
                <div className="flex flex-col items-center">
                  {method.icon && <div className="mb-1 text-accent-green">{method.icon}</div>}
                  <span className="text-white font-medium text-xs sm:text-sm text-center">{method.label}</span>
                  {method.description && (
                    <span className="text-gray-400 text-[10px] sm:text-xs mt-0.5 text-center line-clamp-1">
                      {method.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Money Payment Reference (Optional) */}
        {isMobileMoney && (
          <div>
            <Input
              type="text"
              label="Payment Reference (Optional)"
              placeholder="Enter transaction ID or reference number"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              helperText="Optional: Enter the mobile money transaction reference for record keeping"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
            disabled={checkoutMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCheckout}
            className="flex-1"
            isLoading={checkoutMutation.isPending}
            disabled={checkoutMutation.isPending}
          >
            Complete Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
