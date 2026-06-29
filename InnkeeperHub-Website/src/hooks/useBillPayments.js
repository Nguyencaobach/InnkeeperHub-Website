import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import billPaymentsApi from '../api/billPaymentsApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeItem = (res) => {
  if (res?.data) return res.data;
  return res;
};

const normalizeBillsList = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return [];
};

/**
 * Lấy thông tin thanh toán theo bookingId
 * staleTime: 30 giây (transaction data)
 */
export function useBillPaymentQuery(bookingId) {
  return useQuery({
    queryKey: QUERY_KEYS.BILL_PAYMENTS(bookingId),
    queryFn: () => billPaymentsApi.getByBooking(bookingId),
    select: normalizeItem,
    enabled: !!bookingId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Lấy danh sách hóa đơn với filter (cho RoomInvoiceLog)
 * staleTime: 0 — transactional log
 */
export function useBillPaymentsLogQuery({ search = '', dateFrom = '', dateTo = '' } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.BILL_PAYMENTS_LOG, search, dateFrom, dateTo],
    queryFn: () => billPaymentsApi.getAll({ search, dateFrom, dateTo, limit: 1000 }),
    select: normalizeBillsList,
    staleTime: 0,
    gcTime: 60 * 1000,
  });
}

export function useCreateBillPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => billPaymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billPayments'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
    },
  });
}

export function useUpdateBillPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => billPaymentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billPayments'] });
    },
  });
}

export function useDeleteBillPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => billPaymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billPayments'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILL_PAYMENTS_LOG });
    },
  });
}
