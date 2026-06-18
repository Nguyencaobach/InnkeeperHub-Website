import { useState, useEffect } from 'react';
import './NgrokGate.css';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const IS_NGROK = BASE_URL.includes('ngrok');
const SESSION_KEY = 'ngrok_accepted';

/**
 * NgrokGate: Chỉ hoạt động khi đang dùng ngrok (môi trường demo).
 * Hiển thị overlay yêu cầu user authorize ngrok một lần mỗi session
 * để ảnh load được bình thường trên máy lần đầu truy cập.
 */
function NgrokGate({ children }) {
  const [accepted, setAccepted] = useState(true); // mặc định true để không block nếu không cần

  useEffect(() => {
    // Không hiện nếu không dùng ngrok (localhost dev / production thật)
    if (!IS_NGROK) return;

    // Đã accept trong session này rồi thì bỏ qua
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

    setAccepted(false);
  }, []);

  const handleAuthorize = () => {
    // Mở tab ngrok để user click "Visit Site"
    window.open(BASE_URL, '_blank', 'noopener,noreferrer');
  };

  const handleContinue = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setAccepted(true);
  };

  if (accepted) return children;

  return (
    <>
      {/* Overlay chặn app phía sau */}
      <div className="ngrok-gate-overlay">
        <div className="ngrok-gate-card">
          {/* Icon */}
          <div className="ngrok-gate-icon">
            <i className="ph-fill ph-shield-warning" />
          </div>

          <h2 className="ngrok-gate-title">Cần kích hoạt máy chủ ảnh</h2>
          <p className="ngrok-gate-desc">
            Hệ thống đang sử dụng tunnel tạm thời. Bạn cần xác nhận một lần
            để hình ảnh hiển thị đúng trên thiết bị này.
          </p>

          {/* Bước 1 */}
          <div className="ngrok-gate-step">
            <span className="ngrok-gate-step-num">1</span>
            <div className="ngrok-gate-step-text">
              <strong>Bấm "Mở trang xác nhận"</strong> — trình duyệt sẽ mở tab mới
            </div>
          </div>

          {/* Bước 2 */}
          <div className="ngrok-gate-step">
            <span className="ngrok-gate-step-num">2</span>
            <div className="ngrok-gate-step-text">
              Ở tab mới, bấm nút <strong>"Visit Site"</strong> màu xanh
            </div>
          </div>

          {/* Bước 3 */}
          <div className="ngrok-gate-step">
            <span className="ngrok-gate-step-num">3</span>
            <div className="ngrok-gate-step-text">
              Quay lại tab này và bấm <strong>"Đã xác nhận, vào hệ thống"</strong>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="ngrok-gate-actions">
            <button className="ngrok-gate-btn-primary" onClick={handleAuthorize}>
              <i className="ph-bold ph-arrow-square-out" />
              Mở trang xác nhận
            </button>
            <button className="ngrok-gate-btn-secondary" onClick={handleContinue}>
              <i className="ph-bold ph-check-circle" />
              Đã xác nhận, vào hệ thống
            </button>
          </div>

          <p className="ngrok-gate-note">
            * Chỉ cần làm một lần. Lần sau mở lại trình duyệt mới sẽ hỏi lại.
          </p>
        </div>
      </div>
    </>
  );
}

export default NgrokGate;
