import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import customerApi from '../api/customerApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách khách hàng
 * staleTime: 2 phút (reference data)
 */
export function useCustomersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMERS,
    queryFn: () => customerApi.getAll(),
    select: normalizeList,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => customerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => customerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}

export function useHardDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => customerApi.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
    },
  });
}
