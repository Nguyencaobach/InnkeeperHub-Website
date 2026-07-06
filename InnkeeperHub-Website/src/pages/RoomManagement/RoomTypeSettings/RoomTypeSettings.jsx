import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRoomTypesQuery, useCreateRoomType, useUpdateRoomType, useDeleteRoomType } from '../../../hooks/useRoomTypes';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { getImageSrc } from '../../../utils/imageUrl';
import './RoomTypeSettings.css';

// Danh sách các tiện ích (Phân tích từ hình mẫu)
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

function RoomTypeSettings() {

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===== TANSTACK QUERY: Thay thế useState/useEffect + fetchRoomTypes =====
  const { data: roomTypes = [] } = useRoomTypesQuery();
  const createRoomTypeMutation = useCreateRoomType();
  const updateRoomTypeMutation = useUpdateRoomType();
  const deleteRoomTypeMutation = useDeleteRoomType();

  // null = hiển thị grid card, có giá trị = hiển thị form chi tiết
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({});
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  // States Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [wasCreatingNew, setWasCreatingNew] = useState(false); // track để sau success biết có phải tạo mới không

  // isSaving/isDeleting lấy từ mutation state
  const isSaving = createRoomTypeMutation.isPending || updateRoomTypeMutation.isPending;
  const isDeleting = deleteRoomTypeMutation.isPending;

  const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const parseAmenitiesString = (amenitiesStr) => {
    if (!amenitiesStr) return [];
    try {
      let parsed = typeof amenitiesStr === 'string' ? JSON.parse(amenitiesStr) : amenitiesStr;
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Lỗi giải mã tiện ích phòng:", error);
      if (typeof amenitiesStr === 'string') {
        return amenitiesStr.replace(/[\]["]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  // Mở form chi tiết khi click vào card
  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setFormData(room);
    setSelectedAmenities(parseAmenitiesString(room.amenities));
    setImagePreview(room.room_img_url ? getImageSrc(room.room_img_url) : null);
    setIsEditing(false);
    setErrors({});
  };

  // Quay lại grid card
  const handleBackToGrid = () => {
    setSelectedRoom(null);
    setIsEditing(false);
    setErrors({});
  };

  // Mở form Thêm mới
  const handleAddNew = () => {
    setSelectedRoom(null);
    setFormData({
      name: '', hourly_price: '', daily_price: '',
      capacity: 2, floor: '', bed_type: '', room_size: ''
    });
    setSelectedAmenities([]);
    setImagePreview(null);
    setIsEditing(true);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const formatPriceDisplay = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = String(value).replace(/\./g, '');
    if (isNaN(num) || num === '') return '';
    return Number(num).toLocaleString('de-DE');
  };

  const handlePriceChange = (e) => {
    const { name } = e.target;
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, [name]: raw }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleToggleAmenity = (label) => {
    if (!isEditing) return;
    setSelectedAmenities(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    if (selectedRoom) {
      handleSelectRoom(selectedRoom);
    } else {
      // Đang tạo mới → quay về grid
      handleBackToGrid();
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.name || String(formData.name).trim() === '') {
      newErrors.name = 'Vui lòng nhập tên loại phòng.';
    }
    if (formData.hourly_price === '' || formData.hourly_price === null || Number(formData.hourly_price) < 0) {
      newErrors.hourly_price = 'Không được để trống hoặc nhập số âm.';
    }
    if (formData.daily_price === '' || formData.daily_price === null || Number(formData.daily_price) < 0) {
      newErrors.daily_price = 'Không được để trống hoặc nhập số âm.';
    }
    if (formData.capacity === '' || formData.capacity === null || Number(formData.capacity) < 1) {
      newErrors.capacity = 'Ít nhất là 1 người.';
    }
    if (formData.room_size !== undefined && formData.room_size !== null && String(formData.room_size).trim() !== '') {
      if (Number(formData.room_size) <= 0) {
        newErrors.room_size = 'Diện tích phải lớn hơn 0.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClickSave = () => {
    if (validateForm()) setShowSaveModal(true);
  };

  const confirmSave = async () => {
    if (isSaving) return;
    try {
      const dataToSubmit = new FormData();
      dataToSubmit.append('name', String(formData.name).trim());
      dataToSubmit.append('hourly_price', formData.hourly_price);
      dataToSubmit.append('daily_price', formData.daily_price);
      dataToSubmit.append('capacity', formData.capacity || 2);

      if (formData.floor && String(formData.floor).trim() !== '') {
        dataToSubmit.append('floor', formData.floor);
      }
      if (formData.bed_type && String(formData.bed_type).trim() !== '') {
        dataToSubmit.append('bed_type', formData.bed_type);
      }
      if (formData.room_size && String(formData.room_size).trim() !== '') {
        dataToSubmit.append('room_size', formData.room_size);
      }
      dataToSubmit.append('amenities', JSON.stringify(selectedAmenities));

      if (formData.imageFile) {
        dataToSubmit.append('image', formData.imageFile);
      }

      let savedId = selectedRoom?.id;

      if (selectedRoom) {
        await updateRoomTypeMutation.mutateAsync({ id: selectedRoom.id, formData: dataToSubmit });
      } else {
        const created = await createRoomTypeMutation.mutateAsync(dataToSubmit);
        const createdData = created?.data ?? created;
        savedId = createdData?.id;
      }

      // Mutation thành công — đóng modal và hiện success trước
      setWasCreatingNew(!selectedRoom); // lưu lại trước khi setIsEditing
      setShowSaveModal(false);
      setIsEditing(false);
      setShowSuccessModal(true);

      // Sau đó refetch và cập nhật UI (nếu fail chỉ là UI, không hiện lỗi)
      if (savedId) {
        try {
          await queryClient.refetchQueries({ queryKey: QUERY_KEYS.ROOM_TYPES });
          // axiosClient trả về response.data nên cache chứa { success, data: [...] }
          const cacheRaw = queryClient.getQueryData(QUERY_KEYS.ROOM_TYPES);
          const freshList = Array.isArray(cacheRaw)
            ? cacheRaw
            : Array.isArray(cacheRaw?.data)
              ? cacheRaw.data
              : [];
          const updatedRoom = freshList.find(r => String(r.id) === String(savedId));
          if (updatedRoom) {
            setSelectedRoom(updatedRoom);
            setFormData(updatedRoom);
            setSelectedAmenities(parseAmenitiesString(updatedRoom.amenities));
            setImagePreview(updatedRoom.room_img_url ? getImageSrc(updatedRoom.room_img_url) : null);
          }
        } catch (uiErr) {
          console.warn('[RoomTypeSettings] Refetch sau save thất bại (chỉ ảnh hưởng UI):', uiErr);
        }
      }

    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      const errDetail = error.response?.data;
      const errMsg = errDetail?.errors?.join('\n')
        || errDetail?.message
        || "Dữ liệu đầu vào không hợp lệ hoặc Tên loại phòng đã bị trùng.";
      alert(errMsg);
      setShowSaveModal(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteRoomTypeMutation.mutateAsync(selectedRoom.id);
      // Cache tự động được invalidate
      setShowDeleteModal(false);
      setSelectedRoom(null); // Quay về grid sau khi xóa
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      const rawMsg = error.response?.data?.message
        || error.response?.data?.errors?.join('\n')
        || '';

      // Dịch lỗi kỹ thuật DB sang message thân thiện
      let userMsg;
      if (rawMsg.toLowerCase().includes('foreign key') || rawMsg.toLowerCase().includes('constraint') || rawMsg.toLowerCase().includes('violates')) {
        userMsg = 'Không thể xóa loại phòng này vì vẫn còn phòng đang thuộc loại này.\n\nVui lòng xóa tất cả các phòng trong loại phòng này trước rồi mới xóa loại phòng.';
      } else {
        userMsg = rawMsg || 'Không thể xóa loại phòng. Vui lòng thử lại sau.';
      }
      alert(userMsg);
      setShowDeleteModal(false);
    }
  };

  // ===== RENDER GRID CÁC CARD =====
  const renderGrid = () => (
    <div className="rs-body">
      {roomTypes.length === 0 ? (
        <div className="empty-state-grid">
          <i className="ph-fill ph-door" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
          <h3>Chưa có loại phòng nào</h3>
          <p>Bấm <strong>Thêm loại phòng mới</strong> để bắt đầu.</p>
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

  // ===== RENDER FORM CHI TIẾT (có nút quay lại) =====
  const renderDetail = () => (
    <div className="rs-detail-view">
      {/* Sub-header với nút quay lại */}
      <div className="rs-detail-header">
        <div className="rs-detail-header-left">
          <button className="btn-back" onClick={handleBackToGrid} title="Quay lại danh sách">
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <h3 className="form-title">
            {!selectedRoom ? 'Tạo Loại Phòng Mới' : (isEditing ? 'Chỉnh sửa thông tin' : selectedRoom.name)}
          </h3>
        </div>

        <div className="form-actions">
          {!isEditing ? (
            <>
              <button
                className="btn-primary"
                style={{ fontWeight: 'bold' }}
                onClick={() => navigate(`/rooms/details/${selectedRoom.id}`, { state: { roomTypeName: selectedRoom.name } })}
              >
                Thêm DS phòng
              </button>
              <button className="btn-warning" style={{ fontWeight: 'bold' }} onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
              <button className="btn-danger" style={{ fontWeight: 'bold' }} onClick={() => setShowDeleteModal(true)}>Xóa</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={handleCancel}>Hủy</button>
              <button className="btn-add-green" onClick={handleClickSave}>Lưu thiết lập</button>
            </>
          )}
        </div>
      </div>

      {/* Form nội dung */}
      <div className="rs-detail-body">
        <div className="form-grid">
          {/* Dòng 1 */}
          <div className="input-group full-width">
            <label>Tên loại phòng <span style={{ color: 'red' }}>*</span></label>
            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} disabled={!isEditing} className={errors.name ? 'input-error' : ''} />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* Hàng 1: Số người | Diện tích */}
          <div className="input-group">
            <label>Số người tối đa <span style={{ color: 'red' }}>*</span></label>
            <input type="number" name="capacity" value={formData.capacity || ''} onChange={handleChange} disabled={!isEditing} className={errors.capacity ? 'input-error' : ''} />
            {errors.capacity && <span className="error-text">{errors.capacity}</span>}
          </div>
          <div className="input-group">
            <label>Diện tích (m²)</label>
            <input type="number" name="room_size" value={formData.room_size || ''} onChange={handleChange} disabled={!isEditing} placeholder="VD: 25" className={errors.room_size ? 'input-error' : ''} />
            {errors.room_size && <span className="error-text">{errors.room_size}</span>}
          </div>

          {/* Hàng 2: Giá giờ | Giá ngày */}
          <div className="input-group">
            <label>Giá theo giờ (VNĐ) <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              name="hourly_price"
              value={formatPriceDisplay(formData.hourly_price)}
              onChange={handlePriceChange}
              disabled={!isEditing}
              placeholder="VD: 100.000"
              className={errors.hourly_price ? 'input-error' : ''}
            />
            {errors.hourly_price && <span className="error-text">{errors.hourly_price}</span>}
          </div>
          <div className="input-group">
            <label>Giá theo ngày (VNĐ) <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              name="daily_price"
              value={formatPriceDisplay(formData.daily_price)}
              onChange={handlePriceChange}
              disabled={!isEditing}
              placeholder="VD: 500.000"
              className={errors.daily_price ? 'input-error' : ''}
            />
            {errors.daily_price && <span className="error-text">{errors.daily_price}</span>}
          </div>

          {/* Hàng 3: Loại giường | Tầng */}
          <div className="input-group">
            <label>Loại giường</label>
            <input type="text" name="bed_type" value={formData.bed_type || ''} onChange={handleChange} disabled={!isEditing} placeholder="VD: 1 Giường đôi lớn" />
          </div>
          <div className="input-group">
            <label>Tầng</label>
            <input type="text" name="floor" value={formData.floor || ''} onChange={handleChange} disabled={!isEditing} />
          </div>

          {/* Tiện ích */}
          <div className="input-group full-width">
            <label>Các tiện ích có trong phòng</label>
            <div className="amenities-container">
              <div className="amenities-grid">
                {AMENITIES_LIST.map(amenity => (
                  <label key={amenity.id} className="amenity-item">
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity.label)}
                      onChange={() => handleToggleAmenity(amenity.label)}
                      disabled={!isEditing}
                    />
                    <i className={`amenity-icon ph ${amenity.icon}`}></i>
                    <span>{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Ảnh */}
          <div className="input-group full-width">
            <label>Ảnh đại diện phòng</label>
            <div className="image-upload-wrapper">
              {isEditing && (
                <div style={{ marginBottom: '12px' }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  <span style={{ fontSize: '13px', color: '#ef4444', display: 'block', marginTop: '6px' }}>
                    <i className="ph-fill ph-warning-circle"></i> Kích thước khuyên dùng: 800x450px (Tỷ lệ 16:9)
                  </span>
                </div>
              )}
              <div className="image-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" />
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                    <i className="ph ph-image" style={{ fontSize: '40px' }}></i>
                    <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Chưa có ảnh</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="room-settings-container">
      {/* HEADER CHÍNH */}
      <div className="rs-header">
        <h2>Danh sách Loại phòng</h2>
        {/* Nút thêm mới chỉ hiển thị ở màn grid */}
        {!selectedRoom && !isEditing && (
          <button className="btn-add-green" style={{ fontWeight: 'bold' }} onClick={handleAddNew}>
             Thêm loại phòng mới
          </button>
        )}
      </div>

      {/* NỘI DUNG: Grid hoặc Detail */}
      {(selectedRoom || isEditing) ? renderDetail() : renderGrid()}

      {/* ===== MODAL THÔNG BÁO THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px' }}></i>
            </div>
            <h3 style={{ marginTop: '16px' }}>Thành công!</h3>
            <p>Hành động của bạn đã được thực hiện thành công.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              {wasCreatingNew ? (
                // Sau khi tạo mới → về danh sách
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => {
                  setShowSuccessModal(false);
                  setWasCreatingNew(false);
                  handleBackToGrid();
                }}>
                  Về danh sách loại phòng
                </button>
              ) : (
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowSuccessModal(false)}>Đóng</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN LƯU ===== */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{ color: '#00A4D3' }}>
              <i className="ph ph-floppy-disk"></i>
            </div>
            <h3>Xác nhận lưu</h3>
            <p>Bạn có chắc chắn muốn lưu các thiết lập này không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>Hủy</button>
              <button className="btn-primary" onClick={confirmSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu thiết lập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN XÓA ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              </div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.</p>
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

export default RoomTypeSettings;