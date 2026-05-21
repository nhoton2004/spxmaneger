import { readJSON, writeJSON } from './storage';

const ORDERS_KEY = 'spx_orders_v1';

function now() { return new Date().toISOString(); }

function listInternal() {
  return readJSON(ORDERS_KEY, []);
}

function saveInternal(rows) {
  writeJSON(ORDERS_KEY, rows);
}

/** Chuẩn hóa trạng thái nội bộ từ SPX text */
function normalizeStatus(status) {
  return status || 'Chờ lấy hàng';
}

/** Tính needAction từ trạng thái */
function detectNeedAction(status) {
  const s = String(status || '').toLowerCase();
  return (
    s.includes('không thành công') ||
    s.includes('đang trả') ||
    s.includes('đã trả') ||
    s.includes('hủy') ||
    s.includes('pickup_failed') ||
    s.includes('returning') ||
    s.includes('returned') ||
    s.includes('cancelled')
  );
}

/**
 * Tìm index của đơn trùng theo trackingCode (ưu tiên) hoặc orderCode
 */
function findDuplicateIdx(rows, order) {
  if (order.trackingCode) {
    const idx = rows.findIndex(r => r.trackingCode === order.trackingCode);
    if (idx >= 0) return idx;
  }
  if (order.orderCode) {
    const idx = rows.findIndex(r => r.orderCode && r.orderCode === order.orderCode);
    if (idx >= 0) return idx;
  }
  return -1;
}

export const orderService = {
  list() {
    return listInternal().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  /** Upsert một đơn: cập nhật nếu trùng, thêm mới nếu chưa có */
  upsert(order) {
    const rows = listInternal();
    const idx = rows.findIndex(r => r.trackingCode === order.trackingCode);

    const normalized = {
      ...order,
      status: normalizeStatus(order.status),
      needAction: detectNeedAction(order.status),
      importedAt: now(),
      createdAt: order.createdAt || now(),
    };

    if (idx >= 0) {
      // Cập nhật trường mới nhất, giữ lại id và createdAt gốc
      rows[idx] = {
        ...rows[idx],
        ...normalized,
        id: rows[idx].id,
        createdAt: rows[idx].createdAt,
      };
      saveInternal(rows);
      return { inserted: false, updated: true, order: rows[idx] };
    }

    normalized.id = order.id || (crypto?.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}_${Math.random()}`);
    rows.unshift(normalized);
    saveInternal(rows);
    return { inserted: true, updated: false, order: normalized };
  },

  /**
   * Bulk import: upsert nhiều đơn từ file Excel SPX
   */
  bulkImport(orders, shopId) {
    const rows = listInternal();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errorDetails = [];

    for (const o of orders) {
      if (!o.trackingCode && !o.orderCode) {
        skipped++;
        errorDetails.push(`Bỏ qua: không có mã vận đơn và mã đơn hàng.`);
        continue;
      }

      const idx = rows.findIndex(r => 
        (o.trackingCode && r.trackingCode === o.trackingCode) || 
        (o.orderCode && r.orderCode === o.orderCode)
      );

      const normalized = {
        id: crypto?.randomUUID ? crypto.randomUUID() : `ord_${Date.now()}_${Math.random()}`,
        trackingCode: o.trackingCode || null,
        orderCode: o.orderCode || null,
        trackingUrl: o.trackingUrl || null,
        createdAt: o.createdAt || now(),
        carrier: o.carrier || null,
        serviceType: o.serviceType || null,
        rawStatus: o.rawStatus || null,
        status: o.status || 'unknown',
        accountId: o.accountId || null,
        pickupType: o.pickupType || null,
        actualPickupType: o.actualPickupType || null,
        pickupDate: o.pickupDate || null,
        pickedUpAt: o.pickedUpAt || null,
        deliveredAt: o.deliveredAt || null,
        receiverName: o.receiverName || null,
        receiverPhone: o.receiverPhone || null,
        receiverProvince: o.receiverProvince || null,
        receiverDistrict: o.receiverDistrict || null,
        receiverWard: o.receiverWard || null,
        receiverAddress: o.receiverAddress || null,
        senderName: o.senderName || null,
        senderPhone: o.senderPhone || null,
        paymentRole: o.paymentRole || null,
        deliveryInstruction: o.deliveryInstruction || null,
        customerCode: o.customerCode || null,
        itemList: o.itemList || null,
        codEnabled: o.codEnabled || null,
        codAmount: o.codAmount || 0,
        orderValue: o.orderValue || 0,
        parcelWeight: o.parcelWeight || 0,
        actualWeight: o.actualWeight || 0,
        estimatedShippingFee: o.estimatedShippingFee || 0,
        actualShippingFee: o.actualShippingFee || 0,
        basicShippingFee: o.basicShippingFee || 0,
        insuranceFee: o.insuranceFee || 0,
        codServiceFee: o.codServiceFee || 0,
        returnShippingFee: o.returnShippingFee || 0,
        failedReason: o.failedReason || null,
        buyerRejectFeeEnabled: o.buyerRejectFeeEnabled || null,
        buyerRejectFeeAmount: o.buyerRejectFeeAmount || 0,
        createMethod: o.createMethod || null,
        orderCreator: o.orderCreator || null,
        deliveryAttempts: o.deliveryAttempts || 0,
        shopId: shopId || null,
        importedAt: now(),
        needAction: detectNeedAction(o.status || o.rawStatus),
      };

      if (idx >= 0) {
        // Cập nhật đơn nếu thay đổi trạng thái, phí hoặc thời gian
        const current = rows[idx];
        let changed = false;
        const newObj = { ...current };

        // Chỉ update các trường có giá trị hợp lệ mới
        for (const key of Object.keys(normalized)) {
          if (normalized[key] !== null && normalized[key] !== undefined && normalized[key] !== '' && normalized[key] !== 0) {
             if (current[key] !== normalized[key]) {
               changed = true;
               newObj[key] = normalized[key];
             }
          }
        }
        
        if (changed) {
          rows[idx] = {
            ...newObj,
            id: current.id, // Giữ id cũ
            createdAt: current.createdAt // Giữ createdAt cũ
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        rows.unshift(normalized);
        inserted++;
      }
    }

    saveInternal(rows);
    return { total: orders.length, inserted, updated, skipped, errors: errorDetails.length, errorDetails };
  },

  /**
   * Query đơn với filter đa dạng
   */
/**
 * @param {Object} params
 * @param {string} [params.shopId]
 * @param {string} [params.status]
 * @param {string} [params.from]
 * @param {string} [params.to]
 * @param {string} [params.search]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 */
  query({ shopId, status, from, to, search, page = 1, limit = 20 } = {}) {
    let rows = this.list();

    if (shopId) rows = rows.filter(r => r.shopId === shopId);
    if (status) {
      rows = rows.filter(r =>
        (r.status || '') === status ||
        (r.shippingStatus || '') === status
      );
    }
    if (from) {
      const fromDate = new Date(`${from}T00:00:00`);
      rows = rows.filter(r => {
        const d = new Date(r.orderDate || r.createdAt || 0);
        return d >= fromDate;
      });
    }
    if (to) {
      const toDate = new Date(`${to}T23:59:59`);
      rows = rows.filter(r => {
        const d = new Date(r.orderDate || r.createdAt || 0);
        return d <= toDate;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        String(r.trackingCode || '').toLowerCase().includes(q) ||
        String(r.receiverName || r.customerName || '').toLowerCase().includes(q) ||
        String(r.receiverPhone || r.customerPhone || '').toLowerCase().includes(q)
      );
    }

    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);
    return { data, total, page, limit };
  },

  /** Thống kê cho dashboard */
  dashboardStats(shopId) {
    const rows = this.list().filter(r => !shopId || r.shopId === shopId);
    const statusBreakdown = {};

    for (const r of rows) {
      // Ưu tiên shippingStatus (từ file SPX) rồi đến status
      const s = r.shippingStatus || r.status || 'Không xác định';
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const totalToday = rows.filter(r => {
      const d = r.orderDate || r.createdAt;
      return d && d.slice(0, 10) === todayStr;
    }).length;

    const totalCod = rows.reduce((s, r) => s + Number(r.codAmount || 0), 0);

    // COD chờ đối soát: các đơn đã giao thành công chưa thu tiền
    const codPendingReconcile = rows
      .filter(r => {
        const st = (r.shippingStatus || r.status || '').toLowerCase();
        return st.includes('đã giao') || st.includes('delivered');
      })
      .reduce((s, r) => s + Number(r.codAmount || 0), 0);

    const totalShippingFee = rows.reduce((s, r) => s + Number(r.shippingFee || 0), 0);
    const totalReturnFee = 0; // chưa có trường này

    const needActionCount = rows.filter(r => r.needAction || detectNeedAction(r.status || r.shippingStatus)).length;

    return {
      totalToday,
      totalOrders: rows.length,
      totalCod,
      totalShippingFee,
      totalReturnFee,
      codPendingReconcile,
      needActionCount,
      statusBreakdown,
    };
  },

  /** Xóa tất cả đơn (dùng cho testing) */
  clearAll() {
    saveInternal([]);
  },
};
