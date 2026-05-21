import * as XLSX from 'xlsx';
import { normalizeOrderStatus } from './normalizeOrderStatus';

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function getValue(rowData, possibleHeaders, headersMap) {
  for (const ph of possibleHeaders) {
    const norm = normalizeHeader(ph);
    const actualHeader = headersMap[norm];
    if (actualHeader && rowData[actualHeader] !== undefined && rowData[actualHeader] !== '') {
      return rowData[actualHeader];
    }
  }
  return null;
}

export async function parseSpxExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        let headerRowIndex = -1;
        let headers = [];
        let headersMap = {}; // normalized -> actual header string
        
        const trackingHeaders = [
          "ma van don", "ma van don spx", "ma van chuyen", "ma don vi van chuyen", 
          "so van don", "van don", "tracking number", "tracking no", "spx tracking number", "ma spx"
        ];
        
        const orderCodeHeaders = [
          "ma don hang", "ma don", "order id", "order number", "ma shopee", "don hang"
        ];
        
        let candidates = [];
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i] || [];
          const hasTrackingCode = row.some(cell => {
             const norm = normalizeHeader(cell);
             return trackingHeaders.some(th => norm === th || norm.includes(th)) || 
                    orderCodeHeaders.some(oh => norm === oh || norm.includes(oh));
          });
          if (hasTrackingCode) {
            candidates.push({ index: i, row });
          }
        }

        let bestCandidate = null;
        // Prioritize Vietnamese header row containing "ma van don"
        for (const cand of candidates) {
          const hasVietnamese = cand.row.some(cell => {
            const norm = normalizeHeader(cell);
            return norm === 'ma van don' || norm.includes('ma van don');
          });
          if (hasVietnamese) {
            bestCandidate = cand;
            break;
          }
        }
        // Fallback to English header containing "tracking no"
        if (!bestCandidate) {
          for (const cand of candidates) {
            const hasEnglish = cand.row.some(cell => {
              const norm = normalizeHeader(cell);
              return norm === 'tracking no' || norm.includes('tracking no');
            });
            if (hasEnglish) {
              bestCandidate = cand;
              break;
            }
          }
        }
        // Fallback to first candidate
        if (!bestCandidate && candidates.length > 0) {
          bestCandidate = candidates[0];
        }

        if (bestCandidate) {
          headerRowIndex = bestCandidate.index;
          headers = bestCandidate.row.map(cell => String(cell || '').trim());
          headers.forEach(h => {
             if (h) headersMap[normalizeHeader(h)] = h;
          });
        }
        
        console.log("RAW SHEET SAMPLE:", rows.slice(0, 15));
        console.log("DETECTED HEADER ROW INDEX:", headerRowIndex);
        console.log("DETECTED HEADERS:", headers);

        if (headerRowIndex === -1) {
          const firstFewRows = rows.slice(0, 8).map((r, idx) => `Dòng ${idx + 1}: ${r.filter(Boolean).join(' | ')}`).filter(r => r.length > 10).join('\n');
          throw new Error(`Không tìm thấy dòng tiêu đề chứa mã vận đơn. Dữ liệu các dòng đầu:\n${firstFewRows}`);
        }
        
        let dataStartRowIndex = headerRowIndex + 1;
        // Check if the next row is also a header-like row (e.g. Vietnamese row after English row)
        if (dataStartRowIndex < rows.length) {
          const nextRow = rows[dataStartRowIndex] || [];
          const nextIsHeader = nextRow.some(cell => {
            const norm = normalizeHeader(cell);
            return trackingHeaders.some(th => norm === th || norm.includes(th)) || 
                   orderCodeHeaders.some(oh => norm === oh || norm.includes(oh));
          });
          if (nextIsHeader) {
            dataStartRowIndex++;
          }
        }
        // Do not take rows 1, 2, 3 (index 0, 1, 2) as data
        if (dataStartRowIndex < 3) {
          dataStartRowIndex = 3;
        }

        const orders = [];
        const detectedColumns = Object.keys(headersMap);
        const first5Debug = [];
        
        for (let i = dataStartRowIndex; i < rows.length; i++) {
          const row = rows[i];
          const rowData = {};
          headers.forEach((header, index) => {
            if (header) rowData[header] = row[index];
          });
          
          const trackingCode = getValue(rowData, [
            "Mã vận đơn", "Mã vận đơn SPX", "Mã vận chuyển", "Mã đơn vị vận chuyển", 
            "Số vận đơn", "Vận đơn", "Tracking Number", "Tracking No", 
            "SPX Tracking Number", "Mã SPX"
          ], headersMap);

          const orderCode = getValue(rowData, [
            "Mã đơn hàng", "Mã đơn", "Order ID", "Order Number", "Mã Shopee", "Đơn hàng"
          ], headersMap);

          if (!trackingCode && !orderCode) continue;
          
          const rawStatus = getValue(rowData, ["Trạng thái hiện tại", "Tracking Status"], headersMap);
          const order = {
            trackingCode: trackingCode,
            orderCode: orderCode,
            trackingUrl: getValue(rowData, ["Link tra cứu theo mã vận đơn"], headersMap),
            createdAt: getValue(rowData, ["Thời gian tạo đơn", "Ngày tạo", "Ngày đặt hàng", "Thời gian đặt hàng", "Created At", "Order Created Time", "Create Time"], headersMap),
            carrier: getValue(rowData, ["Tên 3PL"], headersMap),
            serviceType: getValue(rowData, ["Loại dịch vụ"], headersMap),
            rawStatus: rawStatus,
            status: normalizeOrderStatus(rawStatus),
            accountId: getValue(rowData, ["ID tài khoản"], headersMap),
            pickupType: getValue(rowData, ["Lựa chọn lấy hàng ban đầu"], headersMap),
            actualPickupType: getValue(rowData, ["Lựa chọn lấy hàng thực tế"], headersMap),
            pickupDate: getValue(rowData, ["Thời gian hẹn lấy"], headersMap),
            pickedUpAt: getValue(rowData, ["Thời gian lấy hàng/gửi hàng"], headersMap),
            deliveredAt: getValue(rowData, ["Thời gian giao hàng"], headersMap),
            customerName: getValue(rowData, ["Tên khách hàng", "Khách hàng", "Người nhận", "Tên người nhận", "Tên người mua", "Buyer Name", "Receiver Name", "Consignee", "Họ tên"], headersMap),
            customerPhone: getValue(rowData, ["Số điện thoại", "SĐT", "Số điện thoại người nhận", "Điện thoại", "Phone", "Receiver Phone"], headersMap),
            receiverProvince: getValue(rowData, ["Tỉnh, thành", "Receiver Province", "Province"], headersMap),
            receiverDistrict: getValue(rowData, ["Quận, huyện (cũ) / Phường, xã (mới)", "Receiver District(old)/Ward(new)", "Receiver District", "District"], headersMap),
            receiverWard: getValue(rowData, ["Phường, xã (cũ)", "Receiver Ward(old)", "Receiver Ward", "Ward"], headersMap),
            address: getValue(rowData, ["Địa chỉ chi tiết", "Địa chỉ", "Địa chỉ nhận hàng", "Địa chỉ người nhận", "Receiver Address", "Shipping Address", "Receiver Detail Address"], headersMap),
            senderName: getValue(rowData, ["Tên người gửi"], headersMap),
            senderPhone: getValue(rowData, ["Số điện thoại người gửi"], headersMap),
            paymentRole: getValue(rowData, ["Phương thức thanh toán", "Payment Role"], headersMap),
            deliveryInstruction: getValue(rowData, ["Hướng dẫn giao hàng", "Delivery Instruction"], headersMap),
            customerCode: getValue(rowData, ["Mã khách hàng"], headersMap),
            itemList: getValue(rowData, ["Tên sản phẩm, số lượng, giá tiền...", "Item List", "Items"], headersMap),
            codEnabled: getValue(rowData, ["Thu COD (Có/Không)", "COD Collection(Y/N)", "COD Collection"], headersMap),
            codAmount: parseMoney(getValue(rowData, ["Số tiền COD", "COD", "Tiền COD", "Số tiền thu hộ", "Thu hộ", "Amount", "COD Amount", "Tổng tiền thu hộ"], headersMap)),
            orderValue: parseMoney(getValue(rowData, ["Giá trị đơn hàng", "Parcel Value"], headersMap)),
            parcelWeight: parseFloat(getValue(rowData, ["Tổng khối lượng", "Parcel Weight"], headersMap)) || 0,
            actualWeight: parseFloat(getValue(rowData, ["Khối lượng thực tế", "Actual Weight"], headersMap)) || 0,
            estimatedShippingFee: parseMoney(getValue(rowData, ["Phí vận chuyển ước tính", "Estimated Shipping Fee"], headersMap)),
            actualShippingFee: parseMoney(getValue(rowData, ["Phí vận chuyển thực tế", "Actual Shipping Fee"], headersMap)),
            basicShippingFee: parseMoney(getValue(rowData, ["Phí vận chuyển cơ bản", "Basic Shipping Fee"], headersMap)),
            insuranceFee: parseMoney(getValue(rowData, ["Phí bảo hiểm"], headersMap)),
            codServiceFee: parseMoney(getValue(rowData, ["Phí dịch vụ COD"], headersMap)),
            returnShippingFee: parseMoney(getValue(rowData, ["Phí vận chuyển trở lại"], headersMap)),
            failedReason: getValue(rowData, ["Giao hàng không thành công Lý do", "Delivery failed Reason"], headersMap),
            buyerRejectFeeEnabled: getValue(rowData, ["Thu phí từ chối nhận hàng (Y/N)"], headersMap),
            buyerRejectFeeAmount: parseMoney(getValue(rowData, ["Phí từ chối nhận hàng cần thu"], headersMap)),
            createMethod: getValue(rowData, ["Create Method"], headersMap),
            orderCreator: getValue(rowData, ["Order Creator"], headersMap),
            deliveryAttempts: parseInt(getValue(rowData, ["No of Delivery Attempts"], headersMap)) || 0,
          };
          
          orders.push(order);
          if (first5Debug.length < 5) {
            first5Debug.push({
              rawStatus: rawStatus,
              status: order.status
            });
          }
        }
        
        console.log("=== IMPORT SPX DEBUG ===");
        console.log("headerRowIndex:", headerRowIndex);
        console.log("danh sách headers tìm được:", headers);
        console.log("rawStatus 5 dòng đầu:", first5Debug.map(x => x.rawStatus));
        console.log("status normalize 5 dòng đầu:", first5Debug.map(x => x.status));
        console.log("=========================");
        
        resolve({ orders, detectedColumns });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
