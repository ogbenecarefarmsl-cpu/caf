import React, { useState } from 'react';
import { Printer, Download, Smartphone, Wifi } from 'lucide-react';
import {
  getPrinterConfig,
  type PrinterConfig,
} from '../../lib/receipt-printer';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  terminalId: string;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  branchId,
  terminalId,
}) => {
  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    model: 'generic_esc_pos' as PrinterConfig['model'],
    connectionType: 'network' as PrinterConfig['connectionType'],
    paperWidth: 80 as 58 | 80,
    ipAddress: '',
    port: 9100,
    bluetoothName: '',
    autoPrintEnabled: false,
    defaultCopies: 1,
  });

  React.useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getPrinterConfig(branchId, terminalId);
      if (data) {
        setConfig(data);
        setFormData({
          name: data.name,
          model: data.model,
          connectionType: data.connectionType,
          paperWidth: data.paperWidth,
          ipAddress: data.ipAddress || '',
          port: data.port || 9100,
          bluetoothName: data.bluetoothName || '',
          autoPrintEnabled: data.autoPrintEnabled,
          defaultCopies: data.defaultCopies,
        });
      }
    } catch (error) {
      console.error('Failed to load printer config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const endpoint = config
        ? `/printers/${config.id}`
        : '/printers';
      const method = config ? 'PATCH' : 'POST';

      await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          branchId,
          terminalId,
        }),
      });

      alert('Printer settings saved successfully');
      onClose();
    } catch (error) {
      alert('Failed to save printer settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Thermal Printer Settings</h2>

        <div className="space-y-4">
          {/* Printer Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Printer Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              placeholder="Main Counter Printer"
            />
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Connection Type
            </label>
            <select
              value={formData.connectionType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connectionType: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="network">Network (WiFi/Ethernet)</option>
              <option value="bluetooth">Bluetooth (Mobile)</option>
              <option value="usb">USB (Desktop)</option>
              <option value="serial">Serial Port</option>
            </select>
          </div>

          {/* Paper Width */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Paper Width
            </label>
            <select
              value={formData.paperWidth}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paperWidth: Number(e.target.value) as any,
                })
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="58">58mm</option>
              <option value="80">80mm</option>
            </select>
          </div>

          {/* Network Settings */}
          {formData.connectionType === 'network' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, ipAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Port</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData({ ...formData, port: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="9100"
                />
              </div>
            </>
          )}

          {/* Bluetooth Settings */}
          {formData.connectionType === 'bluetooth' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Bluetooth Device Name
              </label>
              <input
                type="text"
                value={formData.bluetoothName}
                onChange={(e) =>
                  setFormData({ ...formData, bluetoothName: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="Thermal Printer BT"
              />
              <p className="text-xs text-gray-500 mt-1">
                📱 Bluetooth pairing will be requested when printing
              </p>
            </div>
          )}

          {/* Auto Print */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.autoPrintEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  autoPrintEnabled: e.target.checked,
                })
              }
              className="w-4 h-4"
            />
            <label className="text-sm font-medium">
              Auto-print receipts after sale
            </label>
          </div>

          {/* Default Copies */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Default Copies
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.defaultCopies}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultCopies: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
            <p className="font-medium mb-2">📱 Mobile Deployment Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>Network:</strong> Best for fixed installations. Works
                on all devices.
              </li>
              <li>
                <strong>Bluetooth:</strong> Best for mobile. Requires Chrome
                98+ on Android.
              </li>
              <li>
                <strong>USB:</strong> Desktop only. Requires Chrome/Edge with
                Web Serial API.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
