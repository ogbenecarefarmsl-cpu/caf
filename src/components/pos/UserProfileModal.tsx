import { useState } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useToast } from '../../hooks/useToast';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import apiClient from '../../lib/api-client';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { showSuccess, showError } = useToast();
  const biometric = useBiometricAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showSuccess('Password changed successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to change password';
      showError(errorMessage || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to invalidate tokens
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and redirect
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-primary-dark rounded-2xl p-6 w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">User Profile</h2>
          <button onClick={onClose} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isChangingPassword ? (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-accent-green flex items-center justify-center text-primary-dark font-bold text-2xl">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <p className="text-accent-green text-xs capitalize">{user.role}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Username</span>
                <span className="text-white">{user.username || user.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Role</span>
                <span className="text-white capitalize">{user.role}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-primary-darker p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-white font-medium">Fingerprint Login</h4>
                  <p className="text-sm text-gray-400 leading-snug">
                    {biometric.isAvailable
                      ? biometric.isEnabled
                        ? 'Fingerprint is registered on this device. You can use it to sign in quickly.'
                        : 'Register fingerprint on this device so you can sign in without typing your password.'
                      : 'Fingerprint sign-in is available in the mobile app on devices that support biometrics.'}
                  </p>
                </div>

                {biometric.isEnabled ? (
                  <button
                    onClick={async () => {
                      await biometric.disable();
                      showSuccess('Fingerprint removed');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 font-medium hover:bg-red-500/25 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!user.username || !accessToken) {
                        showError('Sign in again before registering fingerprint');
                        return;
                      }

                      const registered = await biometric.promptToEnable(user.username, accessToken);
                      if (registered) {
                        showSuccess('Fingerprint registered');
                      } else {
                        showError('Fingerprint was not registered');
                      }
                    }}
                    disabled={!biometric.isAvailable || !accessToken || biometric.isLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {biometric.isLoading ? 'Registering...' : 'Register Fingerprint'}
                  </button>
                )}
              </div>

              {biometric.error && (
                <p className="text-sm text-red-400">{biometric.error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4">
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full py-3 bg-primary-darker border border-gray-600 rounded-xl text-white font-medium hover:border-accent-green transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-red-500/20 border border-red-500 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="flex-1 py-3 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
