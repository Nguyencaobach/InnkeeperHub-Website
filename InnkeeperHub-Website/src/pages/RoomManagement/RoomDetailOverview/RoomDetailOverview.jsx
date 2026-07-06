import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRoomDetailsByTypeQuery } from '../../../hooks/useRoomDetails';
import { useRoomTypesQuery } from '../../../hooks/useRoomTypes';
import './RoomDetailOverview.css';

function RoomActivityList() {
  const { id: roomTypeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const roomTypeName = location.state?.roomTypeName || 'Chi tiết loại phòng';

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // ── TANSTACK QUERY (thay vì raw axios) ──
  // refetchOnMount: 'always' → mỗi lần navigate về trang này đều fetch server mới nhất
  const { data: roomDetails = [] } = useRoomDetailsByTypeQuery(roomTypeId);
  const { data: roomTypesList = [] } = useRoomTypesQuery();
  const roomTypeData = roomTypesList.find(rt => String(rt.id) === String(roomTypeId)) || null;

  // Sắp xếp theo tên phòng
  const sortedRooms = [...roomDetails].sort((a, b) =>
    a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' })
  );

  const displayRooms = sortedRooms.filter(room => {
    // Phòng RESERVED hiển thị như AVAILABLE (khách đặt trước nhưng chưa đến)
    const effectiveStatus = room.status === 'RESERVED' ? 'AVAILABLE' : room.status;
    const matchStatus = filterStatus === 'ALL' || effectiveStatus === filterStatus;
    const matchSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchStatus && matchSearch;
  });

  // Nút chức năng Booking → Chuyển đến trang Tạo phiên thuê
  const handleCreateSession = (room) => {
    navigate(`/rooms/activities/list/${roomTypeId}/create-booking`, {
      state: { room, roomTypeName, roomType: roomTypeData }
    });
  };

  // Nút chức năng Xem phiên thuê → Chuyển đến trang Xem phiên thuê
  const handleViewBooking = (room) => {
    navigate(`/rooms/activities/list/${roomTypeId}/view-booking`, {
      state: { room, roomTypeName, roomType: roomTypeData }
    });
  };

  const handleViewSchedule = (room) => {
    navigate(`/rooms/activities/list/${roomTypeId}/reserved-bookings`, {
      state: { room, roomTypeName, roomType: roomTypeData }
    });
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'AVAILABLE': return <span className="status-badge status-available">Trống</span>;
      case 'RESERVED': return <span className="status-badge status-available">Trống</span>; // Khách đặt trước nhưng chưa đến — phòng vẫn trống thực tế
      case 'OCCUPIED': return <span className="status-badge status-occupied">Đang ở</span>;
      case 'CLEANING': return <span className="status-badge status-cleaning">Đang dọn dẹp</span>;
      case 'MAINTENANCE': return <span className="status-badge status-maintenance">Bảo trì</span>;
      default: return null;
    }
  };

  return (
    <div className="ral-container">
      {/* HEADER */}
      <div className="ral-header">
        <div className="ral-header-left">
          <button className="btn-back" onClick={() => navigate('/rooms/activities')} title="Quay lại Tổng quan">
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <h2>Hoạt động các phòng thuộc: <span>{roomTypeName}</span></h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
          <div className="search-box">
            <i className="ph-bold ph-magnifying-glass search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Trống (Available)</option>
            <option value="OCCUPIED">Đang ở (Occupied)</option>
            <option value="CLEANING">Đang dọn dẹp (Cleaning)</option>
            <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
          </select>
        </div>
      </div>

      {/* BODY - DANH SÁCH */}
      <div className="ral-body">
        {displayRooms.length === 0 ? (
          <div className="empty-list">
            <i className="ph-fill ph-door-open" style={{ fontSize: '64px', color: '#cbd5e1' }}></i>
            <h3>Chưa có phòng nào hoặc không tìm thấy trạng thái này</h3>
            <p>Hãy vào mục Cài đặt phòng để thêm danh sách phòng trước.</p>
          </div>
        ) : (
          <div className="room-list">
            {displayRooms.map(room => (
              <div key={room.id} className="room-list-item">
                <div className="room-info">
                  <div className="room-name">{room.room_number}</div>
                  {renderStatus(room.status)}
                </div>

                {/* 2 NÚT NGHIỆP VỤ MỚI */}
                <div className="room-actions">
                  <button className="btn-action-booking outline" onClick={() => handleViewSchedule(room)}>
                    Lịch đặt trước
                  </button>

                  {/* Nút Tạo phiên thuê — hiện khi AVAILABLE hoặc RESERVED */}
                  {(room.status === 'AVAILABLE' || room.status === 'RESERVED') && (
                    <button
                      className="btn-action-booking primary"
                      onClick={() => handleCreateSession(room)}
                      title="Tạo phiên thuê mới"
                    >
                      Tạo phiên thuê
                    </button>
                  )}

                  {/* Nút Xem phiên thuê — chỉ hiện khi phòng Đang ở */}
                  {room.status === 'OCCUPIED' && (
                    <button
                      className="btn-action-booking btn-view-booking"
                      onClick={() => handleViewBooking(room)}
                      title="Xem thông tin phiên thuê hiện tại"
                    >
                      Xem phiên thuê
                    </button>
                  )}

                  {/* Nút placeholder cho trạng thái khác (Cleaning, Maintenance) */}
                  {room.status === 'CLEANING' && (
                    <button
                      className="btn-action-booking disabled"
                      disabled
                      title="Phòng đang cần dọn dẹp"
                    >
                      Đang dọn dẹp
                    </button>
                  )}
                  {room.status === 'MAINTENANCE' && (
                    <button
                      className="btn-action-booking disabled"
                      disabled
                      title="Phòng đang bảo trì"
                    >
                      Đang bảo trì
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomActivityList;