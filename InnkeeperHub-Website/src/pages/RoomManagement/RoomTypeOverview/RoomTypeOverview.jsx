import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import roomTypeApi from '../../../api/roomTypeApi';
import './RoomTypeOverview.css';

const BASE_URL = import.meta.env.VITE_API_URL || '';
// Xử lý cả URL tương đối mới (/uploads/...) lẫn full URL cũ (http://localhost:3000/...)
const getImageSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) {
    try { return BASE_URL + new URL(url).pathname; } catch { return url; }
  }
  return `${BASE_URL}${url}`;
};

// Danh sách các tiện ích để so sánh và hiển thị icon
const AMENITIES_LIST = [
  { id: 'wifi', label: 'Wifi', icon: 'ph-wifi-high' },
  { id: 'tv', label: 'Smart TV', icon: 'ph-television' },
  { id: 'ac', label: 'Điều hòa', icon: 'ph-snowflake' },
  { id: 'bathtub', label: 'Bồn tắm', icon: 'ph-bathtub' },
  { id: 'fridge', label: 'Tủ lạnh', icon: 'ph-thermometer-cold' },
  { id: 'hairdryer', label: 'Máy sấy', icon: 'ph-wind' },
  { id: 'cooking', label: 'Dụng cụ nấu ăn', icon: 'ph-cooking-pot' },
  { id: 'kettle', label: 'Ấm đun siêu tốc', icon: 'ph-coffee' },
  { id: 'robe', label: 'Áo choàng tắm', icon: 'ph-t-shirt' },
  { id: 'iron', label: 'Bàn ủi', icon: 'ph-drop' },
  { id: 'washing', label: 'Máy giặt', icon: 'ph-washing-machine' },
  { id: 'safe', label: 'Két sắt', icon: 'ph-lock-key' },
  { id: 'microwave', label: 'Lò vi sóng', icon: 'ph-oven' },
  { id: 'coffee', label: 'Cà phê/Trà', icon: 'ph-coffee' },
  { id: 'balcony', label: 'Ban công', icon: 'ph-house-line' },
  { id: 'desk', label: 'Bàn làm việc', icon: 'ph-desktop' },
  { id: 'sofa', label: 'Ghế sofa', icon: 'ph-armchair' },
  { id: 'wardrobe', label: 'Tủ quần áo', icon: 'ph-archive' }
];

function RoomActivityOverview() {
  const navigate = useNavigate();

  const [roomTypes, setRoomTypes] = useState([]);
  // null = hiển thị grid card, có giá trị = hiển thị chi tiết
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const fetchRoomTypes = async () => {
    try {
      const res = await roomTypeApi.getAll();
      let data = [];
      if (Array.isArray(res)) {
        data = res;
      } else if (res?.data && Array.isArray(res.data)) {
        data = res.data;
      }
      setRoomTypes(data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách loại phòng:", error);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchRoomTypes();
    };
    initFetch();
  }, []);

  const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const parseAmenitiesString = (amenitiesStr) => {
    if (!amenitiesStr) return [];
    try {
      let parsed = typeof amenitiesStr === 'string' ? JSON.parse(amenitiesStr) : amenitiesStr;
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (typeof amenitiesStr === 'string') {
        return amenitiesStr.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setSelectedAmenities(parseAmenitiesString(room.amenities));
  };

  const handleBackToGrid = () => {
    setSelectedRoom(null);
    setSelectedAmenities([]);
  };

  const displayAmenities = AMENITIES_LIST.filter(amenity => selectedAmenities.includes(amenity.label));

  // ===== RENDER GRID CÁC CARD =====
  const renderGrid = () => (
    <div className="rao-body">
      {roomTypes.length === 0 ? (
        <div className="empty-state-grid">
          <i className="ph-fill ph-door" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
          <h3>Đang tải dữ liệu...</h3>
          <p>Vui lòng chờ hoặc kiểm tra kết nối.</p>
        </div>
      ) : (
        <div className="room-type-grid">
          {roomTypes.map(room => (
            <div
              key={room.id}
              className="room-type-card"
              onClick={() => handleSelectRoom(room)}
            >
              {/* Ảnh bìa */}
              <div className="card-img-wrapper">
                {room.room_img_url ? (
                  <img src={getImageSrc(room.room_img_url)} alt={room.name} className="card-img" />
                ) : (
                  <div className="card-img-placeholder">
                    <i className="ph-fill ph-image"></i>
                  </div>
                )}
              </div>

              {/* Nội dung card */}
              <div className="card-body">
                <div className="card-name">{room.name}</div>
                <div className="card-meta">
                  <span><i className="ph-fill ph-users"></i> {room.capacity} người tối đa</span>
                </div>
                <div className="card-prices">
                  <div className="card-price-item hourly">
                    <span className="price-label">Theo giờ</span>
                    <span className="price-value">{formatMoney(room.hourly_price)}</span>
                  </div>
                  <div className="card-price-item daily">
                    <span className="price-label">Theo ngày</span>
                    <span className="price-value">{formatMoney(room.daily_price)}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===== RENDER CHI TIẾT (có nút quay lại) =====
  const renderDetail = () => (
    <div className="rao-detail-view">
      {/* Sub-header với nút quay lại */}
      <div className="rao-detail-header">
        <div className="rao-detail-header-left">
          <button className="btn-back" onClick={handleBackToGrid} title="Quay lại danh sách">
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <h3 className="detail-title">{selectedRoom.name}</h3>
          <span className="badge-capacity">
            <i className="ph-fill ph-users"></i> Sức chứa: {selectedRoom.capacity} người
          </span>
        </div>

        <button
          className="btn-view-rooms"
          onClick={() => navigate(`/rooms/activities/list/${selectedRoom.id}`, { state: { roomTypeName: selectedRoom.name } })}
        >
          <i className="ph-bold ph-list-dashes"></i> Xem danh sách phòng
        </button>
      </div>

      {/* Chi tiết nội dung */}
      <div className="rao-detail-body">
        <div className="info-grid">
          <div className="info-box">
            <span className="info-label">Giá theo giờ</span>
            <span className="info-value text-primary">{formatMoney(selectedRoom.hourly_price)}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Giá theo ngày</span>
            <span className="info-value text-warning">{formatMoney(selectedRoom.daily_price)}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Diện tích</span>
            <span className="info-value">{selectedRoom.room_size ? `${selectedRoom.room_size} m²` : '—'}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Loại giường</span>
            <span className="info-value">{selectedRoom.bed_type || '—'}</span>
          </div>
          <div className="info-box">
            <span className="info-label">Vị trí (Tầng)</span>
            <span className="info-value">{selectedRoom.floor || '—'}</span>
          </div>
        </div>

        <div className="amenities-section">
          <h4 style={{ margin: '0 0 16px', color: '#334155', fontSize: '16px' }}>Tiện ích nổi bật</h4>
          {displayAmenities.length > 0 ? (
            <div className="amenities-grid-view">
              {displayAmenities.map(amenity => (
                <div key={amenity.id} className="amenity-badge">
                  <i className={`ph ${amenity.icon}`}></i>
                  <span>{amenity.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Loại phòng này chưa cập nhật tiện ích.</p>
          )}
        </div>

        {selectedRoom.room_img_url && (
          <div className="image-section">
            <h4 style={{ margin: '0 0 16px', color: '#334155', fontSize: '16px' }}>Ảnh đại diện</h4>
            <img src={getImageSrc(selectedRoom.room_img_url)} alt={selectedRoom.name} className="room-cover-img" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rao-container">
      <div className="rao-header">
        <h2>Tổng quan Hoạt động Phòng</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Chọn một loại phòng để xem tình trạng hoạt động và tạo phiên thuê.
        </p>
      </div>

      {selectedRoom ? renderDetail() : renderGrid()}
    </div>
  );
}

export default RoomActivityOverview;