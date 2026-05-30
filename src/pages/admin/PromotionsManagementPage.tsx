import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { useSearchWithDebounce } from '../../hooks/useSearchWithDebounce';
import { unwrapArray } from '../../lib/unwrap-response';

interface Promotion {
  _id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  value: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  createdAt: string;
}

interface PromotionFormData {
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  value: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
}

export const PromotionsManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const {
    value: searchQuery,
    setValue: setSearchQuery,
    debouncedValue: debouncedSearchQuery,
  } = useSearchWithDebounce('');
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const { showSuccess, showError } = useToast();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PromotionFormData>();

  const promotionType = watch('type');

  // Fetch promotions
  const { data: promotions, isLoading, error } = useQuery({
    queryKey: queryKeys.promotions.list({ search: debouncedSearchQuery }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/promotions', { search: debouncedSearchQuery }));
      return unwrapArray<Promotion>(response.data);
    },
  });

  // Create promotion mutation
  const createMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      return apiClient.post('/promotions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promotions.all(), exact: false });
      setIsModalOpen(false);
      reset();
      showSuccess('Promotion created');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to create promotion'),
  });

  // Update promotion mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      if (!editingPromotion) return;
      return apiClient.patch(`/promotions/${editingPromotion._id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promotions.all(), exact: false });
      setIsModalOpen(false);
      setEditingPromotion(null);
      reset();
      showSuccess('Promotion updated');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to update promotion'),
  });

  // Toggle promotion status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return apiClient.patch(`/promotions/${promotionId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promotions.all(), exact: false });
      showSuccess('Promotion status updated');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to update status'),
  });

  // Delete promotion mutation
  const deleteMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return apiClient.delete(`/promotions/${promotionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.promotions.all(), exact: false });
      showSuccess('Promotion deleted');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to delete promotion'),
  });

  const handleOpenModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      reset({
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
        minPurchaseAmount: promotion.minPurchaseAmount,
        maxDiscountAmount: promotion.maxDiscountAmount,
        startDate: promotion.startDate.split('T')[0],
        endDate: promotion.endDate.split('T')[0],
        usageLimit: promotion.usageLimit,
      });
    } else {
      setEditingPromotion(null);
      const today = new Date().toISOString().split('T')[0];
      reset({
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        startDate: today,
        endDate: today,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
    reset();
  };

  const onSubmit = (data: PromotionFormData) => {
    if (editingPromotion) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load promotions" /></AdminLayout>;

  const columns = [
    { key: 'name', header: 'Promotion Name' },
    {
      key: 'type',
      header: 'Type',
      render: (promotion: Promotion) => (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
          {promotion.type === 'percentage' && 'Percentage'}
          {promotion.type === 'fixed_amount' && 'Fixed Amount'}
          {promotion.type === 'buy_x_get_y' && 'Buy X Get Y'}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (promotion: Promotion) => (
        promotion.type === 'percentage'
          ? `${promotion.value}%`
          : format(promotion.value)
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (promotion: Promotion) => (
        <div className="text-sm">
          <div>{new Date(promotion.startDate).toLocaleDateString()}</div>
          <div className="text-gray-500">to {new Date(promotion.endDate).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (promotion: Promotion) => (
        <div>
          <span className="font-semibold">{promotion.usageCount}</span>
          {promotion.usageLimit && <span className="text-gray-500"> / {promotion.usageLimit}</span>}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (promotion: Promotion) => {
        const isExpired = new Date(promotion.endDate) < new Date();
        if (isExpired) {
          return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              Expired
            </span>
          );
        }
        return promotion.isActive ? (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        ) : (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Inactive
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (promotion: Promotion) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenModal(promotion)}
          >
            Edit
          </Button>
          <Button
            variant={promotion.isActive ? 'danger' : 'primary'}
            size="sm"
            onClick={() => toggleStatusMutation.mutate(promotion._id)}
          >
            {promotion.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this promotion?')) {
                deleteMutation.mutate(promotion._id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Promotions Management</h1>
          <Button onClick={() => handleOpenModal()}>
            Create Promotion
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search promotions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Promotions Table */}
        <div className="bg-white rounded-lg shadow">
          <Table
            data={promotions || []}
            columns={columns}
          />
        </div>

        {/* Promotion Form Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Promotion Name"
              {...register('name', { required: 'Promotion name is required' })}
              error={errors.name?.message}
            />

            <Input
              label="Description"
              {...register('description', { required: 'Description is required' })}
              error={errors.description?.message}
            />

            <Select
              label="Promotion Type"
              {...register('type', { required: 'Type is required' })}
              error={errors.type?.message}
            >
              <option value="percentage" className="bg-primary-dark text-white">Percentage Discount</option>
              <option value="fixed_amount" className="bg-primary-dark text-white">Fixed Amount Discount</option>
              <option value="buy_x_get_y" className="bg-primary-dark text-white">Buy X Get Y</option>
            </Select>

            <Input
              label={promotionType === 'percentage' ? 'Discount Percentage' : 'Discount Value'}
              type="number"
              step="0.01"
              min="0"
              {...register('value', {
                required: 'Value is required',
                min: { value: 0, message: 'Must be 0 or greater' },
              })}
              error={errors.value?.message}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                {...register('startDate', { required: 'Start date is required' })}
                error={errors.startDate?.message}
              />

              <Input
                label="End Date"
                type="date"
                {...register('endDate', { required: 'End date is required' })}
                error={errors.endDate?.message}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Purchase Amount (Optional)"
                type="number"
                step="0.01"
                min="0"
                {...register('minPurchaseAmount', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                error={errors.minPurchaseAmount?.message}
              />

              <Input
                label="Max Discount Amount (Optional)"
                type="number"
                step="0.01"
                min="0"
                {...register('maxDiscountAmount', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                error={errors.maxDiscountAmount?.message}
              />
            </div>

            <Input
              label="Usage Limit (Optional)"
              type="number"
              min="0"
              {...register('usageLimit', {
                min: { value: 0, message: 'Must be 0 or greater' },
              })}
              error={errors.usageLimit?.message}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingPromotion
                  ? 'Update Promotion'
                  : 'Create Promotion'}
              </Button>
            </div>

            {(createMutation.isError || updateMutation.isError) && (
              <Error message="Failed to save promotion. Please try again." />
            )}
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
