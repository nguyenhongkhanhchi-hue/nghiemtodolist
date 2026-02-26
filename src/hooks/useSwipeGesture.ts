import { useState, useCallback, useRef } from 'react';

interface SwipeState {
  isSwiping: boolean;
  offsetX: number;
}

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipeGesture({ threshold = 80, onSwipeLeft, onSwipeRight }: UseSwipeOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState>({ isSwiping: false, offsetX: 0 });
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setSwipeState({ isSwiping: true, offsetX: 0 });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (isHorizontal.current) {
      setSwipeState({ isSwiping: true, offsetX: deltaX });
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const { offsetX } = swipeState;
    if (offsetX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (offsetX > threshold && onSwipeRight) {
      onSwipeRight();
    }
    setSwipeState({ isSwiping: false, offsetX: 0 });
    isHorizontal.current = null;
  }, [swipeState, threshold, onSwipeLeft, onSwipeRight]);

  return {
    swipeState,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
