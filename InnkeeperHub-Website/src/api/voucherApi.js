import axiosClient from './axiosClient';

const voucherApi = {
  // ── STAFF: Quét barcode member_code → trả info khách ──────────────────
  lookupMember: (memberCode) => {
    return axiosClient.get(`/api/voucher/lookup-member/${memberCode}`);
  },

  // ── STAFF: Validate mã giảm giá ──────────────────────────────────────
  applyDiscount: (code) => {
    return axiosClient.post('/api/voucher/apply-discount', { code });
  },

  // ── STAFF: Cộng điểm cho khách sau thanh toán ────────────────────────
  addPoints: (customerId, amount, referenceCode) => {
    return axiosClient.post('/api/voucher/add-points', {
      customer_id: customerId,
      amount,
      reference_code: referenceCode,
    });
  },

  // ── STAFF: Ghi nhận sử dụng mã giảm giá ─────────────────────────────
  useDiscount: (code) => {
    return axiosClient.post('/api/voucher/use-discount', { code });
  },
};

export default voucherApi;
