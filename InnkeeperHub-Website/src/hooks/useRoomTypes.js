import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import roomTypeApi from '../api/roomTypeApi';
import { QUERY_KEYS } from './queryKeys';

// ── Helpers ──
const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

// ── Queries ──

/**
 * Lấy danh sách tất cả loại phòng
 * staleTime: 5 phút (master data, ít thay đổi)
 */
export function useRoomTypesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.ROOM_TYPES,
    queryFn: () => roomTypeApi.getAll(),
    select: normalizeList,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ── Mutations ──

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => roomTypeApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_TYPES });
    },
  });
}

export function useUpdateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => roomTypeApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_TYPES });
    },
  });
}

export function useDeleteRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => roomTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_TYPES });
    },
  });
}
