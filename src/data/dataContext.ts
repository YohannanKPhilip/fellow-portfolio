import { createContext, useContext } from 'react';
import type { LoadedData } from '../types';

export type DataState =
  | { status: 'loading' }
  | { status: 'ready'; data: LoadedData }
  | { status: 'error'; message: string };

export const DataContext = createContext<DataState>({ status: 'loading' });

export const useData = () => useContext(DataContext);
