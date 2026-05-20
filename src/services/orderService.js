import { readJSON, writeJSON } from './storage';

const ORDERS_KEY = 'spx_orders_v1';

function now() { return new Date().toISOString(); }

function listInternal() {
  return readJSON(ORDERS_KEY, []);
}

function saveInternal(rows) {
  writeJSON(ORDERS_KEY, rows);
}

function normalizeStatus(status) {
  return status || 'Chờ lấy hàng';
}

function detectNeedAction(status) {
  const s = String(status || '').toLowerCase();
  return s.includes('không thành công') || s.includes('đang trả') || s.includes('đã trả') || s.includes('hủy');
}

export const orderService = {
  list() {
    return listInternal().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  upsert(order) {
    const rows = listInternal();
    const idx = rows.findIndex(r =>
      (order.trackingCode && r.trackingCode === order.trackingCode) ||
      (order.orderCode && r.orderCode === order.orderCode)
    );

    const normalized = {
      ...order,
      status: normalizeStatus(order.status),
      needAction: detectNeedAction(order.status),
      importedAt: order.importedAt || now(),
      createdAt: order.createdAt || now(),
    };

    if (idx >= 0) {
      return { inserted: false, order: rows[idx] };
    }

    rows.unshift(normalized);
    saveInternal(rows);
    return { inserted: true, order: normalized };
  },

  bulkImport(orders, shopId) {
    const rows = listInternal();
    let inserted = 0;
    let duplicated = 0;

    for (const o of orders) {
      const exists = rows.some(r =>
        (o.trackingCode && r.trackingCode === o.trackingCode) ||
        (o.orderCode && r.orderCode === o.orderCode)
      );
      if (exists) {
        duplicated += 1;
        continue;
      }
      rows.unshift({
        id: o.id || (crypto?.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}_${Math.random()}`),
        orderCode: o.orderCode || null,
        trackingCode: o.trackingCode || null,
        customerName: o.customerName || null,
        codAmount: Number(o.codAmount || 0),
        status: normalizeStatus(o.status),
        shopId: shopId || o.shopId || null,
        createdAt: o.createdAt || now(),
        importedAt: now(),
      });
      inserted += 1;
    }

    saveInternal(rows);
    return { total: orders.length, inserted, duplicated, updated: 0 };
  },

  query({ shopId = undefined, status = undefined, from = undefined, to = undefined, search = undefined, page = 1, limit = 20 } = {}) {
    let rows = this.list();

    if (shopId) rows = rows.filter(r => r.shopId === shopId);
    if (status) rows = rows.filter(r => (r.status || '') === status);
    if (from) rows = rows.filter(r => new Date(r.createdAt) >= new Date(`${from}T00:00:00`));
    if (to) rows = rows.filter(r => new Date(r.createdAt) <= new Date(`${to}T23:59:59`));
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        String(r.trackingCode || '').toLowerCase().includes(q) ||
        String(r.orderCode || '').toLowerCase().includes(q) ||
        String(r.customerName || '').toLowerCase().includes(q)
      );
    }

    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);
    return { data, total, page, limit };
  },

  dashboardStats(shopId) {
    const rows = this.list().filter(r => !shopId || r.shopId === shopId);
    const statusBreakdown = {};
    for (const r of rows) {
      const s = r.status || 'Không xác định';
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    return {
      totalToday: rows.filter(r => {
        const d = new Date(r.createdAt);
        const t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
      }).length,
      totalOrders: rows.length,
      totalCod: rows.reduce((s, r) => s + Number(r.codAmount || 0), 0),
      totalShippingFee: 0,
      totalReturnFee: 0,
      codPendingReconcile: rows.filter(r => (r.status || '').includes('Giao thành công')).reduce((s, r) => s + Number(r.codAmount || 0), 0),
      needActionCount: rows.filter(r => detectNeedAction(r.status)).length,
      statusBreakdown,
    };
  },
};
