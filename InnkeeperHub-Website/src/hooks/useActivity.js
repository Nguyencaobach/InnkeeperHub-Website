import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import activityApi from '../api/activityApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy log hoạt động tài khoản (Account Activity)
 * staleTime: 0 — log data, luôn cần mới nhất
 */
export function useActivityLogsQuery(limit = 200, offset = 0) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ACTIVITY_LOGS, limit, offset],
    queryFn: () => activityApi.getAll(limit, offset),
    select: normalizeList,
    staleTime: 0,
    gcTime: 60 * 1000,
  });
}

/**
 * Xóa log theo khoảng thời gian (ADMIN only)
 */
export function useDeleteActivityLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (beforeDate) => activityApi.deleteByDateRange(beforeDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACTIVITY_LOGS });
    },
  });
}
