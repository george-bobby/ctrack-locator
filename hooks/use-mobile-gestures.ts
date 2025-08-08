'use client';

import { useCallback, useEffect, useRef } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useMobileGestures = (
  elementRef: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress();
        clearLongPressTimer();
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, clearLongPressTimer]);

  const handleTouchMove = useCallback(() => {
    // Cancel long press on move
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    clearLongPressTimer();

    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const deltaTime = touchEndRef.current.timestamp - touchStartRef.current.timestamp;

    // Check for swipe gestures
    if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    } else if (deltaTime < 300) {
      // Check for tap gestures
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < 300) {
        // Double tap
        tapCountRef.current++;
        if (tapCountRef.current === 2 && onDoubleTap) {
          onDoubleTap();
          tapCountRef.current = 0;
        }
      } else {
        // Single tap
        tapCountRef.current = 1;
        setTimeout(() => {
          if (tapCountRef.current === 1 && onTap) {
            onTap();
          }
          tapCountRef.current = 0;
        }, 300);
      }

      lastTapRef.current = now;
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, swipeThreshold]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);
};

// Hook for haptic feedback
export const useHapticFeedback = () => {
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const lightImpact = useCallback(() => vibrate(10), [vibrate]);
  const mediumImpact = useCallback(() => vibrate(20), [vibrate]);
  const heavyImpact = useCallback(() => vibrate(50), [vibrate]);
  const success = useCallback(() => vibrate([10, 50, 10]), [vibrate]);
  const warning = useCallback(() => vibrate([50, 50, 50]), [vibrate]);
  const error = useCallback(() => vibrate([100, 50, 100, 50, 100]), [vibrate]);

  return {
    vibrate,
    lightImpact,
    mediumImpact,
    heavyImpact,
    success,
    warning,
    error,
  };
};

// Hook for mobile viewport management
export const useMobileViewport = () => {
  const lockOrientation = useCallback((orientation: 'portrait' | 'landscape') => {
    if (typeof screen !== 'undefined' && 'orientation' in screen && 'lock' in screen.orientation) {
      screen.orientation.lock(orientation).catch(console.warn);
    }
  }, []);

  const unlockOrientation = useCallback(() => {
    if (typeof screen !== 'undefined' && 'orientation' in screen && 'unlock' in screen.orientation) {
      screen.orientation.unlock();
    }
  }, []);

  const enterFullscreen = useCallback((element?: HTMLElement) => {
    const target = element || document.documentElement;
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(console.warn);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(console.warn);
    }
  }, []);

  const preventZoom = useCallback(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }
  }, []);

  const allowZoom = useCallback(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes'
      );
    }
  }, []);

  return {
    lockOrientation,
    unlockOrientation,
    enterFullscreen,
    exitFullscreen,
    preventZoom,
    allowZoom,
  };
};

// Hook for mobile-specific UI interactions
export const useMobileInteractions = () => {
  const addTouchClass = useCallback((element: HTMLElement, className: string = 'mobile-touch-active') => {
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 150);
  }, []);

  const simulateButtonPress = useCallback((element: HTMLElement) => {
    element.classList.add('mobile-haptic');
    setTimeout(() => element.classList.remove('mobile-haptic'), 100);
  }, []);

  const showLoadingOverlay = useCallback((message: string = 'Loading...') => {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-loading-overlay';
    overlay.innerHTML = `
      <div class="text-center text-white">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
    return () => document.body.removeChild(overlay);
  }, []);

  const hideKeyboard = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return {
    addTouchClass,
    simulateButtonPress,
    showLoadingOverlay,
    hideKeyboard,
  };
};
