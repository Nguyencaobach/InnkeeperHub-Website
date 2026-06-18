/**
 * Utility: Tạo URL ảnh đúng cho mọi môi trường (localhost dev & Netlify + ngrok)
 *
 * Vấn đề: ngrok free hiển thị trang cảnh báo HTML khi browser load ảnh trực tiếp
 * (vì browser không thể gắn custom header vào <img src> hay background-image)
 * Giải pháp: Thêm query param ?ngrok-skip-browser-warning=true vào URL ảnh
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const isNgrok = BASE_URL.includes('ngrok');

/**
 * Chuyển đổi image_url từ DB thành URL đúng để hiển thị:
 * - Xử lý đường dẫn tương đối mới: /uploads/... → BASE_URL + /uploads/...
 * - Xử lý full URL cũ trong DB: http://localhost:3000/... → BASE_URL + /uploads/...
 * - Tự động bypass ngrok browser warning bằng query param
 *
 * @param {string|null} url - URL ảnh từ DB (có thể là tương đối hoặc full URL)
 * @returns {string|null} - URL đúng để dùng trong src hoặc background-image
 */
export const getImageSrc = (url) => {
  if (!url) return null;

  let src;
  if (url.startsWith('http')) {
    // Dữ liệu CŨ trong DB: thay thế bất kỳ origin nào (localhost cũ) bằng BASE_URL hiện tại
    try {
      src = BASE_URL + new URL(url).pathname;
    } catch {
      src = url;
    }
  } else {
    // Dữ liệu MỚI: đường dẫn tương đối → ghép BASE_URL vào
    src = `${BASE_URL}${url}`;
  }

  // Quan trọng: browser không thể gắn header vào img/background-image request
  // Dùng query param để bypass ngrok browser warning page
  if (isNgrok) {
    src += '?ngrok-skip-browser-warning=true';
  }

  return src;
};
