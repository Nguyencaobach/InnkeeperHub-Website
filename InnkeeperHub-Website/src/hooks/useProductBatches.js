import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productBatchApi from '../api/productBatchApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách lô hàng theo productId
 * staleTime: 2 phút
 */
export function useProductBatchesQuery(productId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PRODUCT_BATCHES, String(productId)],
    queryFn: () => productBatchApi.getByProductId(productId),
    select: normalizeList,
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateProductBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => productBatchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_BATCHES });
      // Nhập lô mới ảnh hưởng tồn kho
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WAREHOUSE_STATUS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });
}

export function useUpdateProductBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productBatchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_BATCHES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WAREHOUSE_STATUS });
    },
  });
}

export function useDeleteProductBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => productBatchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_BATCHES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WAREHOUSE_STATUS });
    },
  });
}
