'use client';

/**
 * useShops.ts
 * ─────────────────────────────────────────────────────────────
 * Realtime shop management hook — Supabase (replaces Firebase Firestore).
 * Supabase .channel() provides the same realtime behaviour as onSnapshot.
 *
 * Collection equivalent: table `shops`
 * Fields: id, name, owner_id, created_at, updated_at
 *
 * Security model (enforced in queries, schema should add RLS too):
 *   - Normal user  → only sees/edits shops where owner_id = currentUserId
 *   - Admin        → sees all shops
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────
export interface Shop {
  id: string;
  name: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseShopsOptions {
  /** UID of the currently logged-in user. Pass null when unauthenticated. */
  userId: string | null;
  /** When true, all shops are visible regardless of owner_id. */
  isAdmin?: boolean;
}

export interface UseShopsReturn {
  shops: Shop[];
  loading: boolean;
  error: string | null;
  addShop: (name: string) => Promise<Shop>;
  updateShop: (shopId: string, name: string) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────
export function useShops({ userId, isAdmin = false }: UseShopsOptions): UseShopsReturn {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getSupabase();
      let query = db
        .from('shops')
        .select('id, name, owner_id, created_at, updated_at')
        .order('created_at', { ascending: true });

      // Non-admin users only see their own shops
      if (!isAdmin && userId) {
        query = query.eq('owner_id', userId);
      } else if (!isAdmin && !userId) {
        // Unauthenticated: return empty
        setShops([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw new Error(fetchErr.message);
      setShops((data as Shop[]) || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  // ── Realtime subscription (like onSnapshot) ────────────────
  useEffect(() => {
    if (!userId && !isAdmin) {
      setShops([]);
      setLoading(false);
      return;
    }

    fetchShops();

    const db = getSupabase();
    const channelName = `shops-realtime-${userId ?? 'anon'}`;

    // Clean up previous channel before creating new one
    if (channelRef.current) {
      db.removeChannel(channelRef.current);
    }

    const channel = db
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        () => {
          // Re-fetch on any INSERT / UPDATE / DELETE
          fetchShops();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      db.removeChannel(channel);
    };
  }, [userId, isAdmin, fetchShops]);

  // ── CRUD ───────────────────────────────────────────────────

  const addShop = useCallback(
    async (name: string): Promise<Shop> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Tên shop không được để trống.');
      if (!userId) throw new Error('Bạn phải đăng nhập để thêm shop.');

      const db = getSupabase();
      const now = new Date().toISOString();
      const { data, error: insertErr } = await db
        .from('shops')
        .insert({ name: trimmed, owner_id: userId, created_at: now, updated_at: now })
        .select('id, name, owner_id, created_at, updated_at')
        .single();

      if (insertErr) throw new Error(insertErr.message);
      return data as Shop;
    },
    [userId]
  );

  const updateShop = useCallback(
    async (shopId: string, name: string): Promise<void> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Tên shop không được để trống.');

      const db = getSupabase();

      // Permission check: non-admin may only edit their own
      if (!isAdmin) {
        const { data: existing } = await db
          .from('shops')
          .select('owner_id')
          .eq('id', shopId)
          .single();
        if (existing?.owner_id !== userId) {
          throw new Error('Bạn không có quyền sửa shop này.');
        }
      }

      const { error: updateErr } = await db
        .from('shops')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', shopId);

      if (updateErr) throw new Error(updateErr.message);
    },
    [userId, isAdmin]
  );

  const deleteShop = useCallback(
    async (shopId: string): Promise<void> => {
      const db = getSupabase();

      // Permission check
      if (!isAdmin) {
        const { data: existing } = await db
          .from('shops')
          .select('owner_id')
          .eq('id', shopId)
          .single();
        if (existing?.owner_id !== userId) {
          throw new Error('Bạn không có quyền xóa shop này.');
        }
      }

      const { error: deleteErr } = await db.from('shops').delete().eq('id', shopId);
      if (deleteErr) throw new Error(deleteErr.message);
    },
    [userId, isAdmin]
  );

  return {
    shops,
    loading,
    error,
    addShop,
    updateShop,
    deleteShop,
    refetch: fetchShops,
  };
}
