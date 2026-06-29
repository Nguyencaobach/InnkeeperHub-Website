import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import discountApi from '../api/discountApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách giảm giá
 * staleTime: 5 phút (master data)
 */
export function useDiscountsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.DISCOUNTS,
    queryFn: () => discountApi.getAll(),
    select: normalizeList,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => discountApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => discountApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => discountApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOUNTS });
    },
  });
}
