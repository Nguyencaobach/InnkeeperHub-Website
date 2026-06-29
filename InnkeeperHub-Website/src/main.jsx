import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.jsx'

// ===== TANSTACK QUERY CLIENT =====
// Cấu hình global cho toàn bộ ứng dụng
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 2 phút: data được coi là "fresh", không fetch lại trong thời gian này
      staleTime: 2 * 60 * 1000,
      // 5 phút: data bị xóa khỏi cache nếu không có component nào đang dùng
      gcTime: 5 * 60 * 1000,
      // Thử lại 1 lần nếu gặp lỗi mạng
      retry: 1,
      // Tắt tự động refetch khi user focus lại tab/cửa sổ (tránh gọi API không cần thiết)
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* DevTools chỉ hiển thị ở môi trường development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)

