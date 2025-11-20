import { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useContainerSize(defaultSize: Size) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>(defaultSize);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const updateSize = () => {
      // Account for padding (p-3 = 12px on each side = 24px total)
      const padding = 24;
      const width = Math.max(0, (element.clientWidth || defaultSize.width) - padding);
      const height = Math.max(0, (element.clientHeight || defaultSize.height) - padding);
      setSize({ width, height });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      // Throttle updates to prevent rapid re-renders
      requestAnimationFrame(updateSize);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [defaultSize.height, defaultSize.width]);

  return { containerRef, size };
}


