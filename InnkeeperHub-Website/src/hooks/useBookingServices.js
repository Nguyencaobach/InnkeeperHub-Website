import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bookingServiceItemApi from '../api/bookingServiceItemApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách dịch vụ đã sử dụng của 1 booking
 * staleTime: 30 giây (transaction data)
 */
export function useBookingServicesQuery(bookingId) {
  return useQuery({
    queryKey: QUERY_KEYS.BOOKING_SERVICES(bookingId),
    queryFn: () => bookingServiceItemApi.getByBooking(bookingId),
    select: normalizeList,
    enabled: !!bookingId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

export function useAddBookingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => bookingServiceItemApi.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKING_SERVICES(variables.booking_id) });
    },
  });
}

export function useUpdateBookingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => bookingServiceItemApi.update(id, data),
    onSuccess: () => {
      // Invalidate all booking services (không biết bookingId cụ thể từ context này)
      queryClient.invalidateQueries({ queryKey: ['bookingServices'] });
    },
  });
}

export function useDeleteBookingService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => bookingServiceItemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingServices'] });
    },
  });
}
