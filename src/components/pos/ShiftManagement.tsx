import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import apiClient from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useToast } from '../../hooks/useToast';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';

interface Shift {
  _id: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  variance?: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

interface ShiftManagementProps {
  branchId: string;
  terminalId: string;
  onShiftChange: (shift: Shift | null) => void;
}

export const ShiftManagement = ({
  branchId,
  terminalId,
  onShiftChange,
}: ShiftManagementProps) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { showError } = useToast();
  const { format, symbol } = useCurrency();
  
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');

  // Get current shift
  const { data: currentShift, isLoading } = useQuery({
    queryKey: queryKeys.shifts.current({ branchId, terminalId, cashierId: user?.id }),
    queryFn: async () => {
      const response = await apiClient.get('/shifts/current', {
        params: { branchId, terminalId, cashierId: user?.id },
      });
      return (response.data?.data ?? response.data) as Shift;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Open shift mutation
  const openShiftMutation = useMutation({
    mutationFn: async (data: { openingCash: number }) => {
      const response = await apiClient.post('/shifts/open', {
        branchId,
        terminalId,
        cashierId: user?.id,
        openingCash: data.openingCash,
      });
      return (response.data?.data ?? response.data) as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(), exact: false });
      onShiftChange(data);
      setShowOpenModal(false);
      setOpeningCash('');
    },
    onError: (error: Error) => {
      console.error('Failed to open shift:', error);
      showError('Failed to open shift', error.message || 'Unknown error');
    },
  });

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: async (data: { closingCash: number; notes?: string }) => {
      if (!currentShift) {
        throw new Error('No active shift to close');
      }
      const response = await apiClient.post(`/shifts/${currentShift._id}/close`, {
        closingCash: data.closingCash,
        notes: data.notes,
      });
      return (response.data?.data ?? response.data) as Shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all(), exact: false });
      onShiftChange(null);
      setShowCloseModal(false);
      setClosingCash('');
      setNotes('');
    },
    onError: (error: Error) => {
      console.error('Failed to close shift:', error);
      showError('Failed to close shift', error.message || 'Unknown error');
    },
  });

  const handleOpenShift = () => {
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      showError('Invalid Amount', 'Please enter a valid opening cash amount');
      return;
    }
    openShiftMutation.mutate({ openingCash: amount });
  };

  const handleCloseShift = () => {
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      showError('Invalid Amount', 'Please enter a valid closing cash amount');
      return;
    }
    closeShiftMutation.mutate({ closingCash: amount, notes });
  };

  if (isLoading) {
    return (
      <div className="bg-[--color-primary-dark] rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-center">Loading shift information...</p>
      </div>
    );
  }

  return (
    <>
      {/* Shift Status Display */}
      <div className="bg-[--color-primary-dark] rounded-lg p-4 border border-gray-700">
        {currentShift && currentShift.status === 'open' ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[--color-accent-green] rounded-full animate-pulse" />
                <h3 className="text-lg font-semibold text-white">Shift Open</h3>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowCloseModal(true)}
              >
                Close Shift
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Opened At:</p>
                <p className="text-white font-medium">
                  {new Date(currentShift.openedAt).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Opening Cash:</p>
                <p className="text-white font-medium">
                  {format(currentShift.openingCash)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Terminal:</p>
                <p className="text-white font-medium">{currentShift.terminalId}</p>
              </div>
              <div>
                <p className="text-gray-400">Cashier:</p>
                <p className="text-white font-medium">{user?.firstName} {user?.lastName}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-gray-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">No Active Shift</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              You need to open a shift before processing sales
            </p>
            <Button
              variant="primary"
              onClick={() => setShowOpenModal(true)}
            >
              Open Shift
            </Button>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Open Shift"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Enter the opening cash amount in the register to start your shift.
          </p>
          
          <Input
            type="number"
            label="Opening Cash Amount"
            placeholder={`${symbol} 0.00`}
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            min="0"
            step="0.01"
            required
          />

          <div className="bg-[--color-primary-darker] rounded-lg p-3 text-sm">
            <p className="text-gray-400 mb-1">Terminal: <span className="text-white">{terminalId}</span></p>
            <p className="text-gray-400">Cashier: <span className="text-white">{user?.firstName} {user?.lastName}</span></p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowOpenModal(false)}
              className="flex-1"
              disabled={openShiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleOpenShift}
              className="flex-1"
              isLoading={openShiftMutation.isPending}
              disabled={openShiftMutation.isPending}
            >
              Open Shift
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Shift Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Close Shift"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Count the cash in the register and enter the closing amount.
          </p>

          {currentShift && (
            <div className="bg-[--color-primary-darker] rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Cash:</span>
                <span className="text-white">{format(currentShift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected Cash:</span>
                <span className="text-white">
                  {format(currentShift.expectedCash || currentShift.openingCash)}
                </span>
              </div>
            </div>
          )}
          
          <Input
            type="number"
            label="Closing Cash Amount"
            placeholder={`${symbol} 0.00`}
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            min="0"
            step="0.01"
            required
          />

          {closingCash && currentShift && (
            <div className="bg-[--color-primary-darker] rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Variance:</span>
                <span
                  className={`text-lg font-bold ${
                    parseFloat(closingCash) - (currentShift.expectedCash || currentShift.openingCash) === 0
                      ? 'text-[--color-accent-green]'
                      : parseFloat(closingCash) - (currentShift.expectedCash || currentShift.openingCash) > 0
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }`}
                >
                  {format(parseFloat(closingCash) - (currentShift.expectedCash || currentShift.openingCash))}
                </span>
              </div>
            </div>
          )}

          <Input
            type="text"
            label="Notes (Optional)"
            placeholder="Add any notes about this shift..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowCloseModal(false)}
              className="flex-1"
              disabled={closeShiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCloseShift}
              className="flex-1"
              isLoading={closeShiftMutation.isPending}
              disabled={closeShiftMutation.isPending}
            >
              Close Shift
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
