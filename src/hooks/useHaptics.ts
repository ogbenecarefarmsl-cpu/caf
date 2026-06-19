import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHaptics = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const haptic = useCallback((style: HapticStyle = 'light') => {
    // Map haptic styles to vibration patterns
    const patterns: Record<HapticStyle, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [30, 100, 30, 100, 30],
    };

    vibrate(patterns[style]);
  }, [vibrate]);

  return {
    haptic,
    vibrate,
    isSupported: 'vibrate' in navigator,
  };
};
