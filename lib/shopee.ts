import crypto from 'crypto';

const PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const ENV = process.env.SHOPEE_ENV || 'test';

const HOST = ENV === 'test' 
  ? 'https://partner.test-stable.shopeemobile.com' 
  : 'https://partner.shopeemobile.com';

export function getAuthUrl(redirectUrl: string) {
  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${PARTNER_ID}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', PARTNER_KEY).update(baseString).digest('hex');
  
  return `${HOST}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
}

export function signRequest(path: string, accessToken: string = '', shopId: string = '') {
  const timestamp = Math.floor(Date.now() / 1000);
  let baseString = `${PARTNER_ID}${path}${timestamp}`;
  if (accessToken && shopId) {
    baseString += `${accessToken}${shopId}`;
  }
  const sign = crypto.createHmac('sha256', PARTNER_KEY).update(baseString).digest('hex');
  
  return {
    partner_id: PARTNER_ID,
    timestamp,
    sign
  };
}
