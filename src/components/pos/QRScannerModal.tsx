import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../hooks/useToast';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const QRScannerModal = ({ isOpen, onClose, onScan, title = 'Scan Barcode' }: QRScannerModalProps) => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { showError } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showError('Camera access denied. Please enter code manually.');
    }
  }, [showError]);

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanning, startCamera, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    }
    return () => {
      document.body.style.overflow = 'unset';
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setScanning(false);
    setManualCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-primary-dark rounded-2xl p-6 w-[90%] max-w-md outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="qr-scanner-title" className="text-xl font-bold text-white">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close scanner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Camera View */}
          {scanning ? (
            <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-accent-green rounded-xl" />
              </div>
              <button
                onClick={() => setScanning(false)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <button
              onClick={() => setScanning(true)}
              className="w-full aspect-square bg-primary-darker border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-accent-green transition-colors"
            >
              <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white font-medium">Tap to Use Camera</span>
            </button>
          )}

          {/* Manual Entry */}
          <div>
            <label htmlFor="barcode-manual-input" className="block text-gray-400 text-sm mb-2">Or Enter Manually</label>
            <div className="flex space-x-2">
              <input
                id="barcode-manual-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Enter barcode number..."
                className="flex-1 px-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green"
                autoFocus={!scanning}
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="px-6 py-3 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                OK
              </button>
            </div>
          </div>

          <p className="text-gray-400 text-xs text-center">
            Position the barcode within the frame or enter it manually above
          </p>
        </div>
      </div>
    </div>
  );
};
