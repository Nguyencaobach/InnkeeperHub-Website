// ===================================================
// QUERY KEYS - Tập trung tất cả keys của TanStack Query
// Dùng file này để tránh typo khi invalidate queries
// ===================================================

export const QUERY_KEYS = {
  // ── Room Management ──
  ROOM_TYPES: ['roomTypes'],
  ROOM_DETAILS: (roomTypeId) => ['roomDetails', String(roomTypeId)],
  ROOM_DETAILS_ALL: ['roomDetails'],

  // ── Booking ──
  BOOKINGS: ['bookings'],
  BOOKING_BY_ID: (id) => ['bookings', String(id)],
  BOOKING_BY_ROOM: (roomDetailId) => ['bookings', 'byRoom', String(roomDetailId)],

  // ── Booking Services ──
  BOOKING_SERVICES: (bookingId) => ['bookingServices', String(bookingId)],

  // ── Bill Payments ──
  BILL_PAYMENTS: (bookingId) => ['billPayments', String(bookingId)],
  BILL_PAYMENTS_LOG: ['billPaymentsLog'],

  // ── Staff ──
  STAFF: ['staff'],

  // ── Customers ──
  CUSTOMERS: ['customers'],

  // ── Warehouse ──
  PRODUCTS: ['products'],
  PRODUCT_CATEGORIES: ['productCategories'],
  PRODUCT_BATCHES: ['productBatches'],

  // ── Services ──
  DISCOUNTS: ['discounts'],
  ADDITIONAL_SERVICES: ['additionalServices'],

  // ── Dashboard / Reports ──
  WAREHOUSE_STATUS: ['warehouseStatus'],
  ACTIVITY_LOGS: ['activityLogs'],
  ROOM_INVOICE_LOGS: ['roomInvoiceLogs'],

  // ── Profile ──
  PROFILE: ['profile'],
};
