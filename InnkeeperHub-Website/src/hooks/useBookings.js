import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bookingApi from '../api/bookingApi';
import { QUERY_KEYS } from './queryKeys';

// ── Helpers ──
const normalizeItem = (res) => {
  if (res?.data) return res.data;
  return res;
};

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

// ── Queries ──

/**
 * Lấy booking đang active theo room_detail_id
 * staleTime: 30 giây (transaction data, hay thay đổi)
 */
export function useBookingByRoomQuery(roomDetailId) {
  return useQuery({
    queryKey: QUERY_KEYS.BOOKING_BY_ROOM(roomDetailId),
    queryFn: () => bookingApi.getByRoomId(roomDetailId),
    select: normalizeItem,
    enabled: !!roomDetailId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Lấy chi tiết booking theo ID
 */
export function useBookingByIdQuery(id) {
  return useQuery({
    queryKey: QUERY_KEYS.BOOKING_BY_ID(id),
    queryFn: () => bookingApi.getById(id),
    select: normalizeItem,
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Lấy tất cả bookings
 */
export function useBookingsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.BOOKINGS,
    queryFn: () => bookingApi.getAll(),
    select: normalizeList,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

// ── Mutations ──

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => bookingApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => bookingApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKING_BY_ID(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
    },
  });
}

export function useCheckoutBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentData }) => bookingApi.checkout(id, paymentData),
    onSuccess: () => {
      // Sau checkout, invalidate toàn bộ bookings và bill payments
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
      queryClient.invalidateQueries({ queryKey: ['billPayments'] });
    },
  });
}
