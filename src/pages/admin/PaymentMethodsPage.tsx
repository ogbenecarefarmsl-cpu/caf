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
import { queryKeys } from '../../lib/query-keys';
import { unwrapArray } from '../../lib/unwrap-response';

interface PaymentMethod {
  _id: string;
  name: string;
  type: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other';
  isActive: boolean;
  processingFee?: number;
  accountDetails?: string;
  createdAt: string;
}

interface PaymentMethodFormData {
  name: string;
  type: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other';
  processingFee?: number;
  accountDetails?: string;
}

export const PaymentMethodsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentMethodFormData>();

  // Fetch payment methods
  const { data: methods, isLoading, error } = useQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: async () => {
      const response = await apiClient.get('/settings/payment-methods');
      return unwrapArray<PaymentMethod>(response.data);
    },
  });

  // Create payment method mutation
  const createMutation = useMutation({
    mutationFn: async (data: PaymentMethodFormData) => {
      return apiClient.post('/settings/payment-methods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all(), exact: false });
      setIsModalOpen(false);
      reset();
    },
  });

  // Update payment method mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PaymentMethodFormData) => {
      if (!editingMethod) return;
      return apiClient.patch(`/settings/payment-methods/${editingMethod._id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all(), exact: false });
      setIsModalOpen(false);
      setEditingMethod(null);
      reset();
    },
  });

  // Toggle payment method status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return apiClient.patch(`/settings/payment-methods/${methodId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all(), exact: false });
    },
  });

  // Delete payment method mutation
  const deleteMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return apiClient.delete(`/settings/payment-methods/${methodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all(), exact: false });
    },
  });

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      reset({
        name: method.name,
        type: method.type,
        processingFee: method.processingFee,
        accountDetails: method.accountDetails,
      });
    } else {
      setEditingMethod(null);
      reset({
        name: '',
        type: 'cash',
        processingFee: 0,
        accountDetails: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
    reset();
  };

  const onSubmit = (data: PaymentMethodFormData) => {
    if (editingMethod) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load payment methods" /></AdminLayout>;

  const columns = [
    { key: 'name', header: 'Method Name' },
    {
      key: 'type',
      header: 'Type',
      render: (method: PaymentMethod) => {
        const typeLabels = {
          cash: 'Cash',
          card: 'Card',
          mobile_money: 'Mobile Money',
          bank_transfer: 'Bank Transfer',
          other: 'Other',
        };
        const typeColors = {
          cash: 'bg-green-100 text-green-800',
          card: 'bg-blue-100 text-blue-800',
          mobile_money: 'bg-purple-100 text-purple-800',
          bank_transfer: 'bg-yellow-100 text-yellow-800',
          other: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${typeColors[method.type]}`}>
            {typeLabels[method.type]}
          </span>
        );
      },
    },
    {
      key: 'processingFee',
      header: 'Processing Fee',
      render: (method: PaymentMethod) => (
        method.processingFee ? `${method.processingFee}%` : 'N/A'
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (method: PaymentMethod) => (
        method.isActive ? (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        ) : (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Inactive
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (method: PaymentMethod) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenModal(method)}
          >
            Edit
          </Button>
          <Button
            variant={method.isActive ? 'danger' : 'primary'}
            size="sm"
            onClick={() => toggleStatusMutation.mutate(method._id)}
          >
            {method.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {method.type !== 'cash' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this payment method?')) {
                  deleteMutation.mutate(method._id);
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <Button onClick={() => handleOpenModal()}>
            Add Payment Method
          </Button>
        </div>

        {/* Payment Methods Table */}
        <div className="bg-white rounded-lg shadow">
          <Table
            data={methods || []}
            columns={columns}
          />
        </div>

        {/* Payment Method Form Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Method Name"
              {...register('name', { required: 'Method name is required' })}
              error={errors.name?.message}
              placeholder="e.g., Visa/Mastercard, M-Pesa"
            />

            <Select
              label="Type"
              {...register('type', { required: 'Type is required' })}
              error={errors.type?.message}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>

            <Input
              label="Processing Fee (%) - Optional"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('processingFee', {
                min: { value: 0, message: 'Must be 0 or greater' },
                max: { value: 100, message: 'Must be 100 or less' },
              })}
              error={errors.processingFee?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Details (Optional)
              </label>
              <textarea
                {...register('accountDetails')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Account number, merchant ID, etc."
              />
            </div>

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
                  : editingMethod
                  ? 'Update Method'
                  : 'Add Method'}
              </Button>
            </div>

            {(createMutation.isError || updateMutation.isError) && (
              <Error message="Failed to save payment method. Please try again." />
            )}
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};
