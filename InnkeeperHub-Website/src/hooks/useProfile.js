import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import profileApi from '../api/profileApi';
import { QUERY_KEYS } from './queryKeys';

// ── Queries ──

/**
 * Lấy hồ sơ cá nhân của user đang đăng nhập
 * staleTime: 5 phút
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: () => profileApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Lấy thông tin doanh nghiệp (ADMIN only)
 */
export function useBusinessSettingsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.PROFILE, 'business'],
    queryFn: () => profileApi.getBusinessSettings(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// ── Mutations ──

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => profileApi.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData) => profileApi.uploadAvatar(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
  });
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => profileApi.updateBusinessSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PROFILE, 'business'] });
    },
  });
}
