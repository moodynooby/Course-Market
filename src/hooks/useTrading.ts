import { useState, useEffect } from 'react';
import type { TradePost, UserProfile } from '../types';
import {
  createUser,
  getTrades,
  createTrade,
  updateTradeStatus,
  deleteTrade,
  searchTrades,
  getConnectionStatus,
  generateSampleTrades,
} from '../services/tradesApi';

interface TradingState {
  trades: TradePost[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ReturnType<typeof getConnectionStatus>;
}

interface TradingActions {
  createNewUser: (displayName: string, email?: string) => Promise<void>;
  postTrade: (tradeData: {
    courseCode: string;
    courseName: string;
    sectionOffered: string;
    sectionWanted: string;
    action: 'offer' | 'request';
    description?: string;
  }) => Promise<void>;
  updateStatus: (tradeId: string, status: 'pending' | 'completed' | 'cancelled') => Promise<void>;
  removeTrade: (tradeId: string) => Promise<void>;
  refreshTrades: () => Promise<void>;
  searchTradesByFilter: (filters: {
    courseCode?: string;
    action?: 'offer' | 'request';
    status?: string;
  }) => Promise<void>;
  loadSampleData: () => void;
  clearError: () => void;
}

type TradingHook = TradingState & TradingActions;

export function useTrading(): TradingHook {
  const [state, setState] = useState<TradingState>({
    trades: [],
    currentUser: null,
    isLoading: false,
    error: null,
    connectionStatus: getConnectionStatus(),
  });

  const createNewUser = async (displayName: string, email?: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const user = await createUser(displayName, email);
      setState(prev => ({
        ...prev,
        currentUser: user,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to create user: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const postTrade = async (tradeData: {
    courseCode: string;
    courseName: string;
    sectionOffered: string;
    sectionWanted: string;
    action: 'offer' | 'request';
    description?: string;
  }): Promise<void> => {
    if (!state.currentUser) {
      setState(prev => ({
        ...prev,
        error: 'Please create a user profile first',
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const trade = await createTrade(
        state.currentUser.id,
        state.currentUser.displayName,
        tradeData
      );
      
      setState(prev => ({
        ...prev,
        trades: [trade, ...prev.trades],
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to post trade: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const updateStatus = async (
    tradeId: string,
    status: 'pending' | 'completed' | 'cancelled'
  ): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const updatedTrade = await updateTradeStatus(tradeId, status);
      
      if (updatedTrade) {
        setState(prev => ({
          ...prev,
          trades: prev.trades.map(t =>
            t.id === tradeId ? updatedTrade : t
          ),
          isLoading: false,
        }));
      } else {
        throw new Error('Trade not found');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to update trade: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const removeTrade = async (tradeId: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await deleteTrade(tradeId);
      
      setState(prev => ({
        ...prev,
        trades: prev.trades.filter(t => t.id !== tradeId),
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to delete trade: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const refreshTrades = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const trades = await getTrades();
      setState(prev => ({
        ...prev,
        trades,
        isLoading: false,
        connectionStatus: getConnectionStatus(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to refresh trades: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const searchTradesByFilter = async (filters: {
    courseCode?: string;
    action?: 'offer' | 'request';
    status?: string;
  }): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const filteredTrades = await searchTrades(filters);
      setState(prev => ({
        ...prev,
        trades: filteredTrades,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to search trades: ${(error as Error).message}`,
        isLoading: false,
      }));
    }
  };

  const loadSampleData = (): void => {
    if (state.currentUser) {
      generateSampleTrades(state.currentUser.id, state.currentUser.displayName);
      refreshTrades();
    }
  };

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }));
  };

  useEffect(() => {
    refreshTrades();
  }, []);

  return {
    ...state,
    createNewUser,
    postTrade,
    updateStatus,
    removeTrade,
    refreshTrades,
    searchTradesByFilter,
    loadSampleData,
    clearError,
  };
}