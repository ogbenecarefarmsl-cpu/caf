import { forwardRef } from 'react';
import { CURRENCY } from '../../lib/currency';

interface ReceiptItem {
  productName: string;
  productId?: { name?: string; brand?: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface ReceiptProps {
  saleData: {
    _id: string;
    receiptNumber?: string;
    branchName?: string;
    branchAddress?: string;
    branchPhone?: string;
    cashierName?: string;
    items: ReceiptItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    createdAt: string;
  };
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ saleData }, ref) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-2">
            {saleData.branchName || 'CAREFARM POS'}
          </h1>
          {saleData.branchAddress && (
            <p className="text-sm">{saleData.branchAddress}</p>
          )}
          {saleData.branchPhone && (
            <p className="text-sm">Tel: {saleData.branchPhone}</p>
          )}
        </div>

        {/* Receipt Info */}
        <div className="mb-6 text-sm">
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Receipt No:</span>
            <span>{saleData.receiptNumber || saleData._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-semibold">Date:</span>
            <span>{formatDate(saleData.createdAt)}</span>
          </div>
          {saleData.cashierName && (
            <div className="flex justify-between mb-1">
              <span className="font-semibold">Cashier:</span>
              <span>{saleData.cashierName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-semibold">Payment:</span>
            <span className="uppercase">{saleData.paymentMethod}</span>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items.map((item, index) => {
                const brand = item.productId?.brand?.trim();
                const showBrand = brand && brand.toLowerCase() !== 'unknown';
                return (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="py-2 break-words">
                      <div>{item.productName}</div>
                      {showBrand ? (
                        <div className="text-[11px] text-gray-600 break-words">Brand: {brand}</div>
                      ) : null}
                    </td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">
                      {CURRENCY.format(item.unitPrice)}
                    </td>
                    <td className="text-right py-2">
                      {CURRENCY.format(item.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-6 text-sm">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <span>{CURRENCY.format(saleData.subtotal)}</span>
          </div>
          {saleData.discount > 0 && (
            <div className="flex justify-between mb-2">
              <span>Discount:</span>
              <span>-{CURRENCY.format(saleData.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t-2 border-black pt-2">
            <span>TOTAL:</span>
            <span>{CURRENCY.format(saleData.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs border-t-2 border-black pt-4">
          <p className="mb-2">Thank you for your purchase!</p>
          <p className="mb-2">Please keep this receipt for your records</p>
          <p className="text-gray-600">
            This is a computer-generated receipt
          </p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
