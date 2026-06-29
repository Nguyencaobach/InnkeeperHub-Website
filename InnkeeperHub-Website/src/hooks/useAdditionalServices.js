import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import additionalServiceApi from '../api/additionalServiceApi';
import { QUERY_KEYS } from './queryKeys';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  return [];
};

/**
 * Lấy danh sách dịch vụ bổ sung (có hỗ trợ filter theo category)
 * staleTime: 5 phút (master data)
 */
export function useAdditionalServicesQuery(category) {
  return useQuery({
    queryKey: category ? [...QUERY_KEYS.ADDITIONAL_SERVICES, category] : QUERY_KEYS.ADDITIONAL_SERVICES,
    queryFn: () => additionalServiceApi.getAll(category),
    select: normalizeList,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateAdditionalService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => additionalServiceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDITIONAL_SERVICES });
    },
  });
}

export function useUpdateAdditionalService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => additionalServiceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDITIONAL_SERVICES });
    },
  });
}

export function useDeleteAdditionalService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => additionalServiceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDITIONAL_SERVICES });
    },
  });
}
