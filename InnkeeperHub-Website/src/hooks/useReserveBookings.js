import { useQuery } from '@tanstack/react-query';
import reserveBookingApi from '../api/reserveBookingApi';

// Query key cho reserve-bookings
export const RESERVE_BOOKING_KEYS = {
  byRoom: (roomDetailId) => ['reserveBookings', 'byRoom', String(roomDetailId)],
};

// Hook lấy danh sách lịch đặt trước của 1 phòng
// staleTime = 25s (nhỏ hơn cache backend 30s để đảm bảo TanStack không giữ data cũ quá lâu)
export const useReservedBookingsByRoom = (roomDetailId) => {
  return useQuery({
    queryKey: RESERVE_BOOKING_KEYS.byRoom(roomDetailId),
    queryFn: async () => {
      const res = await reserveBookingApi.getByRoomId(roomDetailId);
      return res?.data ?? res ?? [];
    },
    enabled: !!roomDetailId,
    staleTime: 25 * 1000, // 25 giây — phối hợp với cache backend 30s
    refetchOnMount: 'always',
  });
};
