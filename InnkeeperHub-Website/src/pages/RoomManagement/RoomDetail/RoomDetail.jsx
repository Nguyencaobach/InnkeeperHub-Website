import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import roomDetailApi from '../../../api/roomDetailApi';
import './RoomDetail.css';

function RoomDetail() {
  const { id: roomTypeId } = useParams(); // Lấy ID của loại phòng từ URL
  const location = useLocation();
  const navigate = useNavigate();
  
  // Lấy tên loại phòng được truyền từ trang trước (nếu có)
  const roomTypeName = location.state?.roomTypeName || 'Chi tiết';

  const [roomDetails, setRoomDetails] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States cho Form Modal (Thêm/Sửa)
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [formData, setFormData] = useState({ room_number: '', status: 'AVAILABLE' });
  const [errorMsg, setErrorMsg] = useState('');

  // State Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // States loading (chống spam click)
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoomDetails = async () => {
    try {
      const res = await roomDetailApi.getAll();
      if (res.data) {
        // Lọc ra những phòng chi tiết thuộc về loại phòng hiện tại
        const filteredRooms = res.data.filter(room => room.room_type_id === roomTypeId);

        filteredRooms.sort((a, b) => 
          a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' })
        );

        setRoomDetails(filteredRooms);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phòng:", error);
    }
  };

  const displayRooms = roomDetails.filter(room => {
    const matchStatus = filterStatus === 'ALL' || room.status === filterStatus;
    const matchSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchStatus && matchSearch;
  });

  useEffect(() => {
    const initFetch = async () => {
      await fetchRoomDetails();
    };
    initFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeId]);

  // Mở form Thêm mới
  const handleAddNew = () => {
    setIsEditing(false);
    setSelectedRoomId(null);
    setFormData({ room_number: '', status: 'AVAILABLE' });
    setErrorMsg('');
    setShowFormModal(true);
  };

  // Mở form Chỉnh sửa
  const handleEdit = (room) => {
    setIsEditing(true);
    setSelectedRoomId(room.id);
    setFormData({ room_number: room.room_number, status: room.status });
    setErrorMsg('');
    setShowFormModal(true);
  };

  // Mở bảng Xác nhận xóa
  const handleDeleteClick = (roomId) => {
    setSelectedRoomId(roomId);
    setShowDeleteModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  // GỌI API LƯU (THÊM / SỬA)
  const handleSave = async () => {
    if (isSaving) return;
    if (!formData.room_number.trim()) {
      setErrorMsg('Vui lòng nhập Tên/Số phòng.');
      return;
    }
    setIsSaving(true);
    try {
      const dataToSubmit = {
        room_type_id: roomTypeId,
        room_number: formData.room_number,
        status: formData.status
      };

      if (isEditing) {
        await roomDetailApi.update(selectedRoomId, dataToSubmit);
      } else {
        await roomDetailApi.create(dataToSubmit);
      }

      await fetchRoomDetails();
      setShowFormModal(false);
      setShowSuccessModal(true);

    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra (Có thể số phòng đã bị trùng).');
    } finally {
      setIsSaving(false);
    }
  };

  // GỌI API XÓA
  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await roomDetailApi.delete(selectedRoomId);
      await fetchRoomDetails();
      setShowDeleteModal(false);
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Lỗi khi xóa phòng.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Hàm render giao diện Trạng thái
  const renderStatus = (status) => {
    switch(status) {
      case 'AVAILABLE': return <span className="status-badge status-available">Trống</span>;
      case 'OCCUPIED': return <span className="status-badge status-occupied">Đang ở</span>;
      case 'CLEANING': return <span className="status-badge status-cleaning">Đang dọn dẹp</span>;
      case 'MAINTENANCE': return <span className="status-badge status-maintenance">Bảo trì</span>;
      default: return null;
    }
  };

  return (
  <div className="room-detail-container">
      {/* HEADER */}
      <div className="rd-header">
        <div className="rd-header-left">
          <button className="btn-back" onClick={() => navigate('/rooms/settings')} title="Quay lại">
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <h2>Danh sách phòng thuộc: <span>{roomTypeName}</span></h2>
        </div>
        
        {/* Nhóm Bộ lọc và Nút thêm mới nằm cạnh nhau */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', fontWeight: '500', color: '#475569' }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Trống (Available)</option>
            <option value="OCCUPIED">Đang ở (Occupied)</option>
            <option value="CLEANING">Đang dọn dẹp (Cleaning)</option>
            <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
          </select>

          <button className="btn-add-green" onClick={handleAddNew}>
            <i className="ph-bold ph-plus"></i> Thêm phòng mới
          </button>
        </div>
      </div>

      {/* BODY - DANH SÁCH */}
      <div className="rd-body">
        {displayRooms.length === 0 ? (
          <div className="empty-list">
            <i className="ph-fill ph-door-open" style={{ fontSize: '64px', color: '#cbd5e1' }}></i>
            <h3>Chưa có phòng nào hoặc không tìm thấy trạng thái này</h3>
            <p>Hãy bấm "Thêm phòng mới" hoặc chọn bộ lọc khác.</p>
          </div>
        ) : (
          <div className="room-list">
            {displayRooms.map(room => (
              <div key={room.id} className="room-list-item">
                <div className="room-info">
                  <div className="room-name">{room.room_number}</div>
                  {renderStatus(room.status)}
                </div>
                
                {/* Nút hành động kiểu mới (Có chữ, căn giữa) */}
                <div className="room-actions">
                  <button
                    className="btn-action-text edit"
                    onClick={() => handleEdit(room)}
                    disabled={room.status === 'OCCUPIED'}
                    title={room.status === 'OCCUPIED' ? 'Không thể chỉnh sửa khi phòng đang có khách' : ''}
                    style={room.status === 'OCCUPIED' ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                  >
                    Chỉnh sửa
                  </button>
                  <button className="btn-action-text delete" onClick={() => handleDeleteClick(room.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA PHÒNG */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontWeight: 'bold' }}>
              {isEditing ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
            </h3>
            
            <div className="modal-form-group">
              <label>Tên / Số phòng (VD: P101)</label>
              <input 
                type="text" 
                name="room_number" 
                value={formData.room_number} 
                onChange={handleChange}
                placeholder="Nhập tên phòng..."
              />
            </div>
            
            <div className="modal-form-group">
              <label>Trạng thái</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="AVAILABLE">Trống (Available)</option>
                <option value="CLEANING">Đang dọn dẹp (Cleaning)</option>
                <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
              </select>
            </div>

            {errorMsg && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>{errorMsg}</div>}

            <div className="modal-actions" style={{ marginTop: '24px'}}>
              <button className="btn-cancel" onClick={() => setShowFormModal(false)}>Hủy</button>
              <button className="btn-add-green" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÔNG BÁO THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px', color: '#10b981' }}></i>
            </div>
            <h3 style={{marginTop: '16px'}}>Thành công!</h3>
            <p>Hành động của bạn đã được thực hiện thành công.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => setShowSuccessModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÓA */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <i className="ph ph-trash"></i>
            </div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa phòng này không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomDetail;