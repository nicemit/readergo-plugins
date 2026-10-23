import React, { createContext, useContext } from 'react';
import type { CanvasHostAPI } from './hostApi';

const CanvasHostAPIContext = createContext<CanvasHostAPI | null>(null);

export function CanvasHostAPIProvider({
  value,
  children,
}: {
  value: CanvasHostAPI;
  children: React.ReactNode;
}) {
  return <CanvasHostAPIContext.Provider value={value}>{children}</CanvasHostAPIContext.Provider>;
}

export function useCanvasHostAPI(): CanvasHostAPI {
  const api = useContext(CanvasHostAPIContext);
  if (!api) {
    throw new Error('useCanvasHostAPI must be used within CanvasHostAPIProvider');
  }
  return api;
}
