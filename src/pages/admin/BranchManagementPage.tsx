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
import { queryKeys } from '../../lib/query-keys';

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: 'SLE' | 'USD';
  isHeadquarters: boolean;
  config: {
    reorderThreshold: number;
    expiryAlertDays: number[];
    allowNegativeStock: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: 'SLE' | 'USD';
  isHeadquarters: boolean;
  reorderThreshold: number;
  expiryAlertDays: string;
  allowNegativeStock: boolean;
}

export const BranchManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormData>();

  // Fetch branches
  const { data: branches, isLoading, error } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get<Branch[]>('/branches');
      return response.data;
    },
  });

  // Create branch mutation
  const createMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      const expiryAlertDays = data.expiryAlertDays
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));
      const payload = {
        ...data,
        currencyCode: data.currencyCode,
        config: {
          reorderThreshold: data.reorderThreshold,
          expiryAlertDays,
          allowNegativeStock: data.allowNegativeStock,
        },
      };
      const response = await apiClient.post('/branches', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all(), exact: false });
      setIsModalOpen(false);
      reset();
      showSuccess('Branch created');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to create branch'),
  });

  // Update branch mutation
  const updateMutation = useMutation({
    mutationFn: async (data: BranchFormData) => {
      if (!editingBranch) return;
      const expiryAlertDays = data.expiryAlertDays
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));
      const payload = {
        ...data,
        currencyCode: data.currencyCode,
        config: {
          reorderThreshold: data.reorderThreshold,
          expiryAlertDays,
          allowNegativeStock: data.allowNegativeStock,
        },
      };
      const response = await apiClient.patch(`/branches/${editingBranch._id || editingBranch.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all(), exact: false });
      setIsModalOpen(false);
      setEditingBranch(null);
      reset();
      showSuccess('Branch updated');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to update branch'),
  });

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      reset({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        currencyCode: branch.currencyCode || 'SLE',
        isHeadquarters: branch.isHeadquarters,
        reorderThreshold: branch.config.reorderThreshold,
        expiryAlertDays: branch.config.expiryAlertDays.join(', '),
        allowNegativeStock: branch.config.allowNegativeStock,
      });
    } else {
      setEditingBranch(null);
      reset({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        currencyCode: 'SLE',
        isHeadquarters: false,
        reorderThreshold: 10,
        expiryAlertDays: '30, 60, 90',
        allowNegativeStock: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    reset();
  };

  const onSubmit = (data: BranchFormData) => {
    if (editingBranch) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <Error message="Failed to load branches" />;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (branch: Branch) => (
        <div>
          <div className="font-medium">{branch.name}</div>
          <div className="text-sm text-gray-400">{branch.code}</div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (branch: Branch) => (
        <div>
          <div className="text-sm">{branch.phone}</div>
          <div className="text-sm text-gray-400">{branch.email}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (branch: Branch) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            branch.isHeadquarters
              ? 'bg-accent-green text-primary-dark'
              : 'bg-primary-dark text-white'
          }`}
        >
          {branch.isHeadquarters ? 'HQ' : 'Branch'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (branch: Branch) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            branch.isActive
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {branch.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (branch: Branch) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleOpenModal(branch)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout title="Branch Management">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Branches</h2>
            <p className="text-gray-400 mt-1">Manage pharmacy branches and configurations</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            Add Branch
          </Button>
        </div>

        {/* Table */}
        <div className="bg-primary-dark rounded-lg shadow-lg overflow-hidden">
          <Table
            data={branches || []}
            columns={columns}
            emptyMessage="No branches found"
          />
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingBranch ? 'Edit Branch' : 'Add Branch'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Branch Name"
                {...register('name', { required: 'Branch name is required' })}
                error={errors.name?.message}
                placeholder="Enter branch name"
              />
              <Input
                label="Branch Code"
                {...register('code', { required: 'Branch code is required' })}
                error={errors.code?.message}
                placeholder="Enter branch code (e.g., BR001)"
              />
            </div>

            <Input
              label="Address"
              {...register('address', { required: 'Address is required' })}
              error={errors.address?.message}
              placeholder="Enter branch address"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                {...register('phone', { required: 'Phone is required' })}
                error={errors.phone?.message}
                placeholder="+232-XX-XXX-XXX"
              />
            <Input
              label="Email"
              type="email"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message}
              placeholder="branch.name@pharmacy.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Currency"
              {...register('currencyCode', { required: 'Currency is required' })}
              error={errors.currencyCode?.message}
              options={[
                { value: 'SLE', label: 'SLE - Sierra Leone Leone' },
                { value: 'USD', label: 'USD - US Dollar' },
              ]}
            />
          </div>

          {/* Configuration */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Reorder Threshold"
                  type="number"
                  {...register('reorderThreshold', { 
                    required: 'Reorder threshold is required',
                    min: { value: 0, message: 'Must be 0 or greater' },
                    valueAsNumber: true,
                  })}
                  error={errors.reorderThreshold?.message}
                  placeholder="Enter minimum stock level"
                />
                <Input
                  label="Expiry Alert Days (comma-separated)"
                  {...register('expiryAlertDays', { 
                    required: 'Expiry alert days are required' 
                  })}
                  error={errors.expiryAlertDays?.message}
                  placeholder="Enter days (e.g., 30, 60, 90)"
                  helperText="Days before expiry to trigger alerts"
                />
              </div>

              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isHeadquarters')}
                    className="w-4 h-4 rounded border-gray-600 bg-primary-dark text-accent-green focus:ring-accent-green"
                  />
                  <span>Headquarters</span>
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('allowNegativeStock')}
                    className="w-4 h-4 rounded border-gray-600 bg-primary-dark text-accent-green focus:ring-accent-green"
                  />
                  <span>Allow Negative Stock</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingBranch ? 'Update' : 'Create'} Branch
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};


