import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import roomDetailApi from '../api/roomDetailApi';
import { QUERY_KEYS } from './queryKeys';

// ── Helpers ──
const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

// ── Queries ──

/**
 * Lấy tất cả room details (sau đó filter bằng select nếu cần)
 * staleTime: 2 phút
 */
export function useAllRoomDetailsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.ROOM_DETAILS_ALL,
    queryFn: () => roomDetailApi.getAll(),
    select: normalizeList,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Lấy danh sách phòng filter theo roomTypeId (client-side)
 */
export function useRoomDetailsByTypeQuery(roomTypeId) {
  return useQuery({
    queryKey: QUERY_KEYS.ROOM_DETAILS(roomTypeId),
    queryFn: () => roomDetailApi.getAll(),
    select: (res) => {
      const list = normalizeList(res);
      return roomTypeId ? list.filter((r) => String(r.room_type_id) === String(roomTypeId)) : list;
    },
    enabled: !!roomTypeId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ── Mutations ──

export function useCreateRoomDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => roomDetailApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
    },
  });
}

export function useUpdateRoomDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => roomDetailApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
    },
  });
}

export function useDeleteRoomDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => roomDetailApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
    },
  });
}
