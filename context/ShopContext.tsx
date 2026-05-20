'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { shopService } from '@/src/services/shopService';

interface Shop {
  id: string;
  name: string;
  ownerId?: string;
  platform?: string;
  code?: string;
}

interface ShopContextType {
  shops: Shop[];
  selectedShopId: string | null;
  setSelectedShopId: (id: string | null) => void;
  loading: boolean;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const data = shopService.list();
      setShops(Array.isArray(data) ? data : []);

      const savedId = localStorage.getItem('selectedShopId');
      if (savedId && data.some(s => s.id === savedId)) {
        setSelectedShopId(savedId);
      } else if (data.length > 0) {
        setSelectedShopId(data[0].id);
      } else {
        setSelectedShopId(null);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      localStorage.setItem('selectedShopId', selectedShopId);
    } else {
      localStorage.removeItem('selectedShopId');
    }
  }, [selectedShopId]);

  return (
    <ShopContext.Provider value={{ 
      shops, 
      selectedShopId, 
      setSelectedShopId, 
      loading, 
      refreshShops: fetchShops
    }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
