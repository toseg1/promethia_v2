/**
 * Creates a debounced function that delays invoking func until after wait milliseconds 
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  
  const throttled = ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;
    
    if (now - lastCallTime >= wait) {
      func(...args);
      lastCallTime = now;
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        if (lastArgs !== null) {
          func(...lastArgs);
          lastCallTime = Date.now();
          lastArgs = null;
        }
        timeoutId = null;
      }, wait - (now - lastCallTime));
    }
  }) as T & { cancel: () => void };
  
  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };
  
  return throttled;
}