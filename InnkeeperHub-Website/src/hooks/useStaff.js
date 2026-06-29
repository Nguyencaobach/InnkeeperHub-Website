import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import staffApi from '../api/staffApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách nhân viên
 * staleTime: 2 phút (reference data)
 */
export function useStaffQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.STAFF,
    queryFn: () => staffApi.getAll(),
    select: normalizeList,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => staffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAFF });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAFF });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => staffApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STAFF });
    },
  });
}
