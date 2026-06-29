import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productCategoryApi from '../api/productCategoryApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách danh mục sản phẩm
 * staleTime: 5 phút (master data, ít thay đổi)
 */
export function useProductCategoriesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_CATEGORIES,
    queryFn: () => productCategoryApi.getAll(),
    select: normalizeList,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => productCategoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_CATEGORIES });
    },
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productCategoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_CATEGORIES });
    },
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => productCategoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_CATEGORIES });
      // Xóa danh mục có thể ảnh hưởng đến products
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
    },
  });
}
