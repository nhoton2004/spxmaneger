'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Shop {
  id: string;
  name: string;
  owner_id?: string;
  platform?: string;
}

interface ShopContextType {
  shops: Shop[];
  selectedShopId: string | null;
  setSelectedShopId: (id: string | null) => void;
  loading: boolean;
  refreshShops: () => Promise<void>;
  user: { uid: string; email?: string } | null;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string; email?: string } | null>({ uid: 'default-user' }); // Hiện tại mock user

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/shops');
      const data = await res.json();
      if (Array.isArray(data)) {
        setShops(data);
        
        // Restore from localStorage
        const savedId = localStorage.getItem('selectedShopId');
        if (savedId && data.some(s => s.id === savedId)) {
          setSelectedShopId(savedId);
        } else if (data.length > 0) {
          setSelectedShopId(data[0].id);
        }
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
    }
  }, [selectedShopId]);

  return (
    <ShopContext.Provider value={{ 
      shops, 
      selectedShopId, 
      setSelectedShopId, 
      loading, 
      refreshShops: fetchShops,
      user
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
