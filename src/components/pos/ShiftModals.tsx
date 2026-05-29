import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useCurrency } from '../../hooks/useCurrency';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (openingCash: number) => void;
  isLoading?: boolean;
}

export const OpenShiftModal = ({ isOpen, onClose, onSubmit, isLoading }: OpenShiftModalProps) => {
  const { symbol } = useCurrency();
  const [openingCash, setOpeningCash] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const parsed = parseFloat(openingCash);
    if (isNaN(parsed) || parsed < 0) return;
    onSubmit(parsed);
    setOpeningCash('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="open-shift-title">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative bg-primary-dark rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-700">
        <h2 id="open-shift-title" className="text-xl font-bold text-white mb-4">Open Shift</h2>
        <p className="text-gray-400 mb-4">Enter the opening cash amount in the register.</p>

        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Opening Cash Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green font-bold">{symbol}</span>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder={`${symbol} 0.00`}
              className="w-full pl-10 pr-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !openingCash.trim()}
            className="flex-1"
          >
            {isLoading ? 'Opening...' : 'Open Shift'}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (closingCash: number, notes: string) => void;
  isLoading?: boolean;
  openingCash: number;
  totalSales: number;
  totalExpenses: number;
  expectedCash: number;
}

export const CloseShiftModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  openingCash,
  totalSales,
  totalExpenses,
  expectedCash,
}: CloseShiftModalProps) => {
  const { symbol, format } = useCurrency();
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const parsed = parseFloat(closingCash);
    if (isNaN(parsed) || parsed < 0) return;
    onSubmit(parsed, notes.trim());
    setClosingCash('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="close-shift-title">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative bg-primary-dark rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-700">
        <h2 id="close-shift-title" className="text-xl font-bold text-white mb-4">Close Shift</h2>
        <p className="text-gray-400 mb-4">Count the cash in the register and confirm shift closure.</p>

        <div className="bg-primary-darker rounded-xl p-4 mb-4 space-y-2 border border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Opening Cash</span>
            <span className="text-white">{format(openingCash)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Sales</span>
            <span className="text-white">{format(totalSales)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Expenses</span>
            <span className="text-red-300">- {format(totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-base pt-2 border-t border-gray-700">
            <span className="text-white font-medium">Expected Cash</span>
            <span className="text-accent-green font-bold">{format(expectedCash)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Actual Closing Cash Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green font-bold">{symbol}</span>
              <input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder={`${symbol} 0.00`}
                className="w-full pl-10 pr-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
              />
            </div>
          </div>

          <Textarea
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any discrepancy or handover note..."
            rows={3}
          />
        </div>

        <div className="flex space-x-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={isLoading || !closingCash.trim()}
            className="flex-1"
          >
            {isLoading ? 'Closing...' : 'Close Shift'}
          </Button>
        </div>
      </div>
    </div>
  );
};
