// Performance utility functions
import React from 'react';

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization for expensive computations
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Prevent memory leaks by limiting cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof performance !== 'undefined') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

// React component performance wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  name: string
) => {
  return React.memo((props: P) => {
    React.useEffect(() => {
      const start = performance.now();
      return () => {
        const end = performance.now();
        console.log(`${name} render cycle: ${end - start}ms`);
      };
    });
    
    return React.createElement(Component, props);
  });
};

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFn);
  
  return (props: React.ComponentProps<T>) => 
    React.createElement(
      React.Suspense,
      { fallback: fallback ? React.createElement(fallback) : React.createElement('div', {}, 'Loading...') },
      React.createElement(LazyComponent, props)
    );
};

// Memory usage monitoring (development only)
export const logMemoryUsage = () => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memInfo = (performance as any).memory;
    console.log({
      usedJSHeapSize: `${Math.round(memInfo.usedJSHeapSize / 1024 / 1024)} MB`,
      totalJSHeapSize: `${Math.round(memInfo.totalJSHeapSize / 1024 / 1024)} MB`,
      jsHeapSizeLimit: `${Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024)} MB`
    });
  }
};

// Bundle size analysis helper
export const analyzeComponentSize = (component: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Component analysis:', {
      name: component.name || component.displayName || 'Anonymous',
      type: typeof component,
      props: component.defaultProps ? Object.keys(component.defaultProps) : []
    });
  }
};