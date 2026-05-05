import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { queryKeys } from '../../lib/query-keys';

interface SystemSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  lowStockThreshold: number;
  receiptFooter: string;
  enableLoyalty: boolean;
  loyaltyPointsRate: number;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
}

export const SystemSettingsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'loyalty' | 'notifications'>('general');
  const { showSuccess, showError } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SystemSettings>();

  // Fetch system settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: queryKeys.systemSettings.detail(),
    queryFn: async () => {
      const response = await apiClient.get('/settings');
      return response.data as SystemSettings;
    },
  });

  // Reset form when settings data is loaded
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      return apiClient.patch('/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systemSettings.all(), exact: false });
      showSuccess('Settings saved');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to save settings'),
  });

  const onSubmit = (data: SystemSettings) => {
    updateMutation.mutate(data);
  };

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load system settings" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`${
                activeTab === 'general'
                  ? 'border-accent-green text-accent-green'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`${
                activeTab === 'loyalty'
                  ? 'border-accent-green text-accent-green'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Loyalty Program
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`${
                activeTab === 'notifications'
                  ? 'border-accent-green text-accent-green'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Notifications
            </button>
          </nav>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">General Settings</h2>
              
              <Input
                label="Company Name"
                {...register('companyName', { required: 'Company name is required' })}
                error={errors.companyName?.message}
              />

              <Input
                label="Company Address"
                {...register('companyAddress', { required: 'Address is required' })}
                error={errors.companyAddress?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  {...register('companyPhone', { required: 'Phone is required' })}
                  error={errors.companyPhone?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  {...register('companyEmail', { required: 'Email is required' })}
                  error={errors.companyEmail?.message}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Currency"
                  {...register('currency', { required: 'Currency is required' })}
                  error={errors.currency?.message}
                >
                  <option value="USD" className="bg-primary-dark text-white">USD - US Dollar</option>
                  <option value="EUR" className="bg-primary-dark text-white">EUR - Euro</option>
                  <option value="GBP" className="bg-primary-dark text-white">GBP - British Pound</option>
                  <option value="SLE" className="bg-primary-dark text-white">SLE - Sierra Leonean Leone</option>
                  <option value="GHS" className="bg-primary-dark text-white">GHS - Ghanaian Cedi</option>
                  <option value="KES" className="bg-primary-dark text-white">KES - Kenyan Shilling</option>
                </Select>

                <Select
                  label="Timezone"
                  {...register('timezone', { required: 'Timezone is required' })}
                  error={errors.timezone?.message}
                >
                  <option value="UTC" className="bg-primary-dark text-white">UTC</option>
                  <option value="America/New_York" className="bg-primary-dark text-white">Eastern Time</option>
                  <option value="America/Chicago" className="bg-primary-dark text-white">Central Time</option>
                  <option value="America/Denver" className="bg-primary-dark text-white">Mountain Time</option>
                  <option value="America/Los_Angeles" className="bg-primary-dark text-white">Pacific Time</option>
                  <option value="Europe/London" className="bg-primary-dark text-white">London</option>
                  <option value="Africa/Freetown" className="bg-primary-dark text-white">Freetown</option>
                  <option value="Africa/Lagos" className="bg-primary-dark text-white">Lagos</option>
                  <option value="Africa/Nairobi" className="bg-primary-dark text-white">Nairobi</option>
                </Select>

                <Select
                  label="Date Format"
                  {...register('dateFormat', { required: 'Date format is required' })}
                  error={errors.dateFormat?.message}
                >
                  <option value="MM/DD/YYYY" className="bg-primary-dark text-white">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY" className="bg-primary-dark text-white">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD" className="bg-primary-dark text-white">YYYY-MM-DD</option>
                </Select>
              </div>

              <Input
                label="Low Stock Threshold"
                type="number"
                min="0"
                {...register('lowStockThreshold', {
                  required: 'Threshold is required',
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                error={errors.lowStockThreshold?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Receipt Footer
                </label>
                <textarea
                  {...register('receiptFooter')}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-md focus:outline-none focus:ring-accent-green focus:border-accent-green placeholder-gray-500"
                  placeholder="Thank you for your business!"
                />
              </div>
            </div>
          )}

          {/* Loyalty Settings */}
          {activeTab === 'loyalty' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Loyalty Program Settings</h2>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableLoyalty"
                  {...register('enableLoyalty')}
                  className="h-4 w-4 text-accent-green focus:ring-accent-green border-gray-600 bg-white/5 rounded"
                />
                <label htmlFor="enableLoyalty" className="ml-2 block text-sm text-gray-300">
                  Enable Loyalty Program
                </label>
              </div>

              <Input
                label="Points Rate (Points per currency unit spent)"
                type="number"
                step="0.01"
                min="0"
                {...register('loyaltyPointsRate', {
                  min: { value: 0, message: 'Must be 0 or greater' },
                })}
                error={errors.loyaltyPointsRate?.message}
                placeholder="e.g., 1 point per $1 spent"
              />

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> When enabled, customers will earn loyalty points on every purchase.
                  The points rate determines how many points they earn per currency unit spent.
                </p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableEmailNotifications"
                    {...register('enableEmailNotifications')}
                    className="h-4 w-4 text-accent-green focus:ring-accent-green border-gray-600 bg-white/5 rounded"
                  />
                  <label htmlFor="enableEmailNotifications" className="ml-2 block text-sm text-gray-300">
                    Enable Email Notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableSMSNotifications"
                    {...register('enableSMSNotifications')}
                    className="h-4 w-4 text-accent-green focus:ring-accent-green border-gray-600 bg-white/5 rounded"
                  />
                  <label htmlFor="enableSMSNotifications" className="ml-2 block text-sm text-gray-300">
                    Enable SMS Notifications
                  </label>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-300">
                  <strong>Note:</strong> Notifications will be sent for important events like low stock alerts,
                  expiry reminders, and order confirmations.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => settings && reset(settings)}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {updateMutation.isError && (
            <Error message="Failed to save settings. Please try again." />
          )}
          {updateMutation.isSuccess && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="text-sm text-green-300">Settings saved successfully!</p>
            </div>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};
