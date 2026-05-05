import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useCurrency } from '../../hooks/useCurrency';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface ProductPricing {
  productId: string;
  productName: string;
  basePrice: number;
  costPrice: number;
  suggestedRetailPrice: number;
  markupPercentage: number;
  effectiveSellingPrice: number;
  batchPrices: {
    batchId: string;
    lotNumber: string;
    sellingPrice: number;
    purchasePrice: number;
    expiryDate: Date;
  }[];
}

interface BulkPriceUpdate {
  strategy: {
    useProductBasePrice: boolean;
    useLatestBatchPrice: boolean;
    useCostPlusMarkup: boolean;
    markupPercentage?: number;
  };
  applyToProducts?: string[];
  applyToBranches?: string[];
  newBasePrice?: number;
  newMarkupPercentage?: number;
}

export const PricingManagementPage = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const { selectedBranch } = useBranchStore();
  const { showSuccess, showError } = useToast();
  const branchId = getBranchId(selectedBranch);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<BulkPriceUpdate>();

  // Fetch products for selection
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get('/products', {
        params: branchId ? { branchId } : {},
      });
      return response.data.data;
    },
    enabled: !!branchId,
  });

  // Fetch pricing data for selected product
  const { data: productPricing, isLoading: pricingLoading, error: pricingError } = useQuery({
    queryKey: queryKeys.pricing.product(selectedProductId, branchId),
    queryFn: async () => {
      if (!selectedProductId) return null;
      const response = await apiClient.get(buildApiUrl(`/products/${selectedProductId}/pricing`, {
        branchId,
      }));
      console.log('Product pricing data:', response.data);
      
      // Transform data to ensure all required fields exist
      const data = response.data;
      return {
        productId: data.productId || data._id || selectedProductId,
        productName: data.productName || data.name || '',
        basePrice: data.basePrice || 0,
        costPrice: data.costPrice || 0,
        suggestedRetailPrice: data.suggestedRetailPrice || data.sellingPrice || 0,
        markupPercentage: data.markupPercentage || 0,
        effectiveSellingPrice: data.effectiveSellingPrice || data.sellingPrice || data.basePrice || 0,
        batchPrices: data.batchPrices || [],
      } as ProductPricing;
    },
    enabled: !!selectedProductId && !!branchId,
  });

  // Fetch pricing analytics
  const { data: analytics } = useQuery({
    queryKey: queryKeys.pricing.analytics(branchId),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/products/pricing-analytics', {
        branchId,
      }));
      return response.data;
    },
    enabled: !!branchId,
  });

  // Bulk price update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: BulkPriceUpdate) => {
      const response = await apiClient.post('/products/bulk-price-update', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all(), exact: false });
      setIsBulkUpdateModalOpen(false);
      reset();
      showSuccess('Prices updated successfully');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to update prices'),
  });

  // Sync batch prices mutation
  const syncBatchPricesMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiClient.post(buildApiUrl(`/products/${productId}/sync-batch-prices`, {
        branchId,
      }));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.all(), exact: false });
      showSuccess('Batch prices synced');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to sync prices'),
  });

  const handleBulkUpdate = (data: BulkPriceUpdate) => {
    bulkUpdateMutation.mutate({
      ...data,
      applyToBranches: branchId ? [branchId] : undefined,
    });
  };

  if (!branchId) {
    return (
      <AdminLayout title="Pricing Management">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
          <p className="mt-2 text-gray-400">
            Pricing is branch-scoped. Choose a branch before reviewing product prices or running updates.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (productsLoading) return <AdminLayout><Loading /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Pricing Management</h1>
          <Button 
            onClick={() => setIsBulkUpdateModalOpen(true)}
            className="bg-accent-green hover:bg-accent-green/90"
          >
            Bulk Price Update
          </Button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Total Products</h3>
              <p className="text-2xl font-bold text-white">{analytics.totalProducts}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Average Markup</h3>
              <p className="text-2xl font-bold text-accent-green">{analytics.averageMarkup.toFixed(1)}%</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Average Price</h3>
              <p className="text-2xl font-bold text-white">{format(analytics.averageSellingPrice)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Custom Pricing</h3>
              <p className="text-2xl font-bold text-blue-400">{analytics.productsWithCustomPricing}</p>
            </div>
          </div>
        )}

        {/* Product Selection */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Product Pricing Details</h2>
          <Select
            label="Select Product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">Select a product...</option>
            {products?.map((product: { _id: string; name: string; sku: string; sellingPrice: number }) => (
              <option key={product._id} value={product._id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </Select>

          {/* Product Pricing Details */}
          {selectedProductId && (
            <div className="mt-6">
              {pricingLoading ? (
                <Loading />
              ) : pricingError ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-2">Failed to load pricing data</p>
                  <p className="text-sm text-gray-400">
                    {pricingError instanceof Error ? pricingError.message : 'Unknown error occurred'}
                  </p>
                </div>
              ) : productPricing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <p className="text-sm text-gray-400 mb-2">Cost Price</p>
                      <p className="text-3xl font-bold text-white">{format(productPricing.costPrice)}</p>
                      <p className="text-xs text-gray-500 mt-1">What you paid for it</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <p className="text-sm text-gray-400 mb-2">Selling Price</p>
                      <p className="text-3xl font-bold text-accent-green">{format(productPricing.effectiveSellingPrice)}</p>
                      <p className="text-xs text-gray-500 mt-1">What customers pay</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-sm text-blue-400">
                      <span className="font-semibold">Profit per item:</span> {format(productPricing.effectiveSellingPrice - productPricing.costPrice)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold text-white">Batch Prices</h3>
                    <Button
                      onClick={() => syncBatchPricesMutation.mutate(selectedProductId)}
                      disabled={syncBatchPricesMutation.isPending}
                      size="sm"
                    >
                      Sync Batch Prices
                    </Button>
                  </div>

                  {productPricing.batchPrices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Lot Number</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Purchase Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Selling Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Expiry Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {productPricing.batchPrices.map((batch) => (
                            <tr key={batch.batchId}>
                              <td className="px-4 py-3 text-sm text-white">{batch.lotNumber}</td>
                              <td className="px-4 py-3 text-sm text-white">{format(batch.purchasePrice)}</td>
                              <td className="px-4 py-3 text-sm text-accent-green font-semibold">{format(batch.sellingPrice)}</td>
                              <td className="px-4 py-3 text-sm text-gray-400">
                                {new Date(batch.expiryDate).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No batches found for this product</p>
                  )}
                </div>
              ) : (
                <Error message="Failed to load pricing data" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Price Update Modal */}
      <Modal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => setIsBulkUpdateModalOpen(false)}
        title="Bulk Price Update"
      >
        <form onSubmit={handleSubmit(handleBulkUpdate)} className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Pricing Strategy</h3>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="useProductBasePrice"
                {...register('strategy.useProductBasePrice')}
                className="h-4 w-4 rounded border-gray-600 bg-primary-darker text-accent-green"
              />
              <label htmlFor="useProductBasePrice" className="text-sm text-white">
                Update Product Base Prices
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="useCostPlusMarkup"
                {...register('strategy.useCostPlusMarkup')}
                className="h-4 w-4 rounded border-gray-600 bg-primary-darker text-accent-green"
              />
              <label htmlFor="useCostPlusMarkup" className="text-sm text-white">
                Apply Cost + Markup Strategy
              </label>
            </div>
          </div>

          <Input
            label="New Base Price (Le)"
            type="number"
            min="0"
            step="0.01"
            {...register('newBasePrice', {
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
            error={errors.newBasePrice?.message}
          />

          <Input
            label="New Markup Percentage (%)"
            type="number"
            min="0"
            step="0.1"
            {...register('newMarkupPercentage', {
              min: { value: 0, message: 'Must be 0 or greater' },
            })}
            error={errors.newMarkupPercentage?.message}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsBulkUpdateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkUpdateMutation.isPending}
              className="bg-accent-green hover:bg-accent-green/90"
            >
              {bulkUpdateMutation.isPending ? 'Updating...' : 'Update Prices'}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default PricingManagementPage;
