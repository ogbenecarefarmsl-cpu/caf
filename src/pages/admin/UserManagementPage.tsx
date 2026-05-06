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
import { getErrorMessage } from '../../lib/error-utils';
import { queryKeys } from '../../lib/query-keys';
import {
  passwordValidation,
  optionalPasswordValidation,
  emailValidation,
  nameValidation,
  requiresBranchAssignment,
} from '../../lib/validation';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'branch_manager' | 'pharmacist' | 'cashier' | 'auditor';
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
}

interface UserFormData {
  username: string;
  password?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: string;
}

export const UserManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormData>();

  const selectedRole = watch('role');

  // Check if role requires branch assignment
  const needsBranch = requiresBranchAssignment(selectedRole);

  // Fetch users
  const { data: users, isLoading, error } = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const response = await apiClient.get('/users');
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as User[];
    },
  });

  // Fetch branches for dropdown
  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Branch[];
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const payload = {
        ...data,
        branchId: data.branchId || undefined,
      };
      const response = await apiClient.post('/users', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), exact: false });
      setIsModalOpen(false);
      reset();
      showSuccess('User created successfully');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to create user'));
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!editingUser) return;
      const payload: Partial<UserFormData> = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        branchId: data.branchId || undefined,
      };
      // Only include password if it's provided
      if (data.password) {
        payload.password = data.password;
      }
      const response = await apiClient.patch(`/users/${editingUser.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all(), exact: false });
      setIsModalOpen(false);
      setEditingUser(null);
      reset();
      showSuccess('User updated successfully');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to update user'));
    },
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      reset({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branchId: user.branchId || '',
        password: '',
      });
    } else {
      setEditingUser(null);
      reset({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'cashier',
        branchId: '',
        password: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load users" /></AdminLayout>;

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    branch_manager: 'Branch Manager',
    pharmacist: 'Pharmacist',
    cashier: 'Cashier',
    auditor: 'Auditor',
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-600',
    branch_manager: 'bg-blue-600',
    pharmacist: 'bg-green-600',
    cashier: 'bg-yellow-600',
    auditor: 'bg-gray-600',
  };

  // Check if role requires branch assignment
  const requiresBranch = needsBranch;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (user: User) => (
        <div>
          <div className="font-medium">{`${user.firstName} ${user.lastName}`}</div>
          <div className="text-sm text-gray-400">@{user.username}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span
          className={`px-2 py-1 rounded text-xs text-white ${roleColors[user.role]}`}
        >
          {roleLabels[user.role]}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (user: User) => (
        <span className="text-sm">
          {user.branchName || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: User) => (
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            user.isActive
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleOpenModal(user)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Users</h2>
            <p className="text-gray-400 mt-1">Manage system users and permissions</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            Add User
          </Button>
        </div>

        {/* Table */}
        <div className="bg-[--color-primary-dark] rounded-lg shadow-lg overflow-hidden">
          <Table
            data={users || []}
            columns={columns}
            emptyMessage="No users found"
          />
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Add User'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Username"
                {...register('username', { required: 'Username is required' })}
                error={errors.username?.message}
                placeholder="Enter username"
                disabled={!!editingUser}
              />
              <div>
                <Input
                  label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  type="password"
                  {...register('password', editingUser ? optionalPasswordValidation : passwordValidation)}
                  error={errors.password?.message}
                  placeholder="••••••••"
                />
                {!editingUser && (
                  <p className="text-xs text-gray-400 mt-1">
                    Min 8 chars with uppercase, lowercase, number & special char (@$!%*?&)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register('firstName', nameValidation)}
                error={errors.firstName?.message}
                placeholder="Enter first name"
              />
              <Input
                label="Last Name"
                {...register('lastName', nameValidation)}
                error={errors.lastName?.message}
                placeholder="Enter last name"
              />
            </div>

            <Input
              label="Email"
              type="email"
              {...register('email', emailValidation)}
              error={errors.email?.message}
              placeholder="user@pharmacy.com"
            />

            {/* Role and Branch Assignment */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Role & Access</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Role"
                  {...register('role', { required: 'Role is required' })}
                  error={errors.role?.message}
                  options={[
                    { value: 'cashier', label: 'Cashier' },
                    { value: 'pharmacist', label: 'Pharmacist' },
                    { value: 'branch_manager', label: 'Branch Manager' },
                    { value: 'auditor', label: 'Auditor' },
                    { value: 'super_admin', label: 'Super Admin' },
                  ]}
                />
                <Select
                  label="Branch"
                  {...register('branchId', { 
                    required: requiresBranch ? 'Branch is required for this role' : false 
                  })}
                  error={errors.branchId?.message}
                  options={[
                    { value: '', label: requiresBranch ? 'Select a branch' : 'No branch (HQ)' },
                    ...(branches || []).map(branch => ({
                      value: branch._id || branch.id,
                      label: `${branch.name} (${branch.code})`,
                    })),
                  ]}
                  disabled={!requiresBranch}
                />
              </div>

              {requiresBranch && (
                <p className="text-sm text-gray-400 mt-2">
                  This role requires branch assignment
                </p>
              )}
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
                {editingUser ? 'Update' : 'Create'} User
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};


