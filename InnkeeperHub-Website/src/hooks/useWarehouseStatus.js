import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import warehouseStatusApi from '../api/warehouseStatusApi';
import { QUERY_KEYS } from './queryKeys';

const DEFAULT_DATA = { lowStockAlert: [], expiringAlert: [], lockedBatches: [] };

const normalizeData = (res) => {
  // API trả về { data: { lowStockAlert, expiringAlert, lockedBatches } }
  if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (typeof res === 'object' && !Array.isArray(res) && res !== null) return res;
  return DEFAULT_DATA;
};

/**
 * Lấy trạng thái kho (3 bảng dashboard)
 * staleTime: 0 — luôn fetch lại khi component mount
 */
export function useWarehouseStatusQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.WAREHOUSE_STATUS,
    queryFn: () => warehouseStatusApi.getDashboard(),
    select: normalizeData,
    staleTime: 0,
    gcTime: 60 * 1000,
    placeholderData: DEFAULT_DATA,
  });
}

/**
 * Tiêu hủy lô hàng
 */
export function useDiscardBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, data }) => warehouseStatusApi.discardBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WAREHOUSE_STATUS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_BATCHES });
    },
  });
}
