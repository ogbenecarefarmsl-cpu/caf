import { useAlertReplacement } from '../../hooks/useAlertReplacement';

/**
 * Test component to verify toast notifications are working correctly.
 * This can be temporarily added to any page for testing purposes.
 */
export const ToastTestComponent = () => {
  const { alertError, alertWarning, alertInfo, alertSuccess } = useAlertReplacement();

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-50 space-x-2 flex">
      <button
        onClick={() => alertSuccess('Success! Operation completed successfully.')}
        className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
      >
        Test Success
      </button>
      <button
        onClick={() => alertError('Error! Something went wrong.')}
        className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      >
        Test Error
      </button>
      <button
        onClick={() => alertWarning('Warning! Please check your input.')}
        className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
      >
        Test Warning
      </button>
      <button
        onClick={() => alertInfo('Info: This is an informational message.')}
        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >
        Test Info
      </button>
    </div>
  );
};