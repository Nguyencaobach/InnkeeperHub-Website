import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { BrowserMultiFormatReader } from '@zxing/browser';
import productApi from '../../../api/productApi';
import { getImageSrc } from '../../../utils/imageUrl';
import './Products.css';

function Products() {
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy ID và Tên danh mục từ Router State (Do trang Danh mục truyền sang)
  const categoryId = location.state?.categoryId;
  const categoryName = location.state?.categoryName || 'Chi tiết danh mục';

  const [productList, setProductList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // States cho Form Modal (Thêm/Sửa)
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [formData, setFormData] = useState({ is_active: true });
  const [priceDisplayValue, setPriceDisplayValue] = useState(''); // Giá hiển thị có dấu chấm
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  // States Delete & Success Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // States loading (chống spam click)
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ===== States BARCODE MODAL =====
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const barcodeCanvasRef = useRef(null);

  // ===== States SCANNER MODAL =====
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerVideoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const scannerControlsRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const res = await productApi.getAll();
      if (res.data) {
        const filtered = res.data.filter(p => p.category_id === categoryId);
        setProductList(filtered);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    }
  };

  useEffect(() => {
    if (!categoryId) {
      navigate('/warehouse/categories');
      return;
    }
    const initFetch = async () => {
      await fetchProducts();
    };
    initFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, navigate]);

  // ===== BỘ LỌC KẾT HỢP (Status + Keyword) =====
  const displayProducts = productList.filter(product => {
    const matchStatus =
      filterStatus === 'ACTIVE' ? product.is_active === true :
        filterStatus === 'INACTIVE' ? product.is_active === false :
          true;
    const keyword = searchKeyword.trim().toLowerCase();
    const matchKeyword = keyword === '' || product.name?.toLowerCase().includes(keyword);
    return matchStatus && matchKeyword;
  });

  // ===== ĐỊNH DẠNG TIỀN (dấu chấm ngăn 3 số) =====
  const formatMoney = (amount) =>
    new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';

  // ===== BARCODE MODAL =====
  const handleShowBarcode = (product) => {
    setBarcodeProduct(product);
    setShowBarcodeModal(true);
  };

  // Vẽ barcode lên canvas khi modal mở
  useEffect(() => {
    if (showBarcodeModal && barcodeProduct && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, barcodeProduct.sku || 'NO-SKU', {
          format: 'CODE128',
          lineColor: '#1e293b',
          width: 2.5,
          height: 90,
          displayValue: true,
          fontOptions: 'bold',
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 8,
          fontSize: 14,
          margin: 16,
          background: '#ffffff',
        });
      } catch (e) {
        console.error('Lỗi khi tạo barcode:', e);
      }
    }
  }, [showBarcodeModal, barcodeProduct]);

  const handleDownloadBarcode = () => {
    if (!barcodeCanvasRef.current || !barcodeProduct) return;
    const link = document.createElement('a');
    link.download = `barcode-${barcodeProduct.sku || barcodeProduct.product_id}.png`;
    link.href = barcodeCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCloseBarcodeModal = () => {
    setShowBarcodeModal(false);
    setBarcodeProduct(null);
  };

  // ===== SCANNER =====
  const stopScanner = useCallback(() => {
    if (scannerControlsRef.current) {
      try { scannerControlsRef.current.stop(); } catch { /* ignore */ }
      scannerControlsRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleOpenScanner = () => {
    setScannerError('');
    setShowScannerModal(true);
  };

  const handleCloseScannerModal = () => {
    stopScanner();
    setShowScannerModal(false);
    setScannerError('');
  };

  // Khởi động camera khi modal mở
  useEffect(() => {
    if (!showScannerModal) return;

    let active = true;

    const startScan = async () => {
      try {
        setIsScanning(true);
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices || devices.length === 0) {
          setScannerError('Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.');
          setIsScanning(false);
          return;
        }

        const deviceId = devices[0].deviceId;

        const controls = await codeReader.decodeFromVideoDevice(
          deviceId,
          scannerVideoRef.current,
          (result, err) => {
            if (!active) return;
            if (result) {
              const scannedText = result.getText();
              // Tìm sản phẩm trùng SKU
              const found = productList.find(
                p => p.sku?.toLowerCase() === scannedText.toLowerCase()
              );
              if (found) {
                setSearchKeyword(found.name);
              } else {
                // Nếu không tìm thấy SKU, thử dùng text quét làm keyword
                setSearchKeyword(scannedText);
              }
              stopScanner();
              setShowScannerModal(false);
            }
            if (err && err.name !== 'NotFoundException') {
              console.warn('Scanner error:', err);
            }
          }
        );

        if (active) {
          scannerControlsRef.current = controls;
        } else {
          try { controls.stop(); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Lỗi khởi động camera:', err);
        if (active) {
          setScannerError('Không thể truy cập camera. Hãy cho phép quyền camera trong trình duyệt.');
          setIsScanning(false);
        }
      }
    };

    startScan();

    return () => {
      active = false;
      if (scannerControlsRef.current) {
        try { scannerControlsRef.current.stop(); } catch { /* ignore */ }
        scannerControlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScannerModal]);

  // ===== FORM HANDLERS =====
  const handleAddNew = () => {
    setIsEditing(false);
    setSelectedProductId(null);
    setFormData({ name: '', sku: '', unit: '', retail_price: '', is_active: true });
    setPriceDisplayValue('');
    setImagePreview(null);
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setSelectedProductId(product.product_id);
    setFormData({
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      retail_price: product.retail_price,
      is_active: product.is_active
    });
    // Hiển thị giá có dấu chấm khi mở form sửa
    setPriceDisplayValue(
      product.retail_price != null && product.retail_price !== ''
        ? new Intl.NumberFormat('vi-VN').format(Number(product.retail_price))
        : ''
    );
    setImagePreview(product.image_url || null);
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleDeleteClick = (productId) => {
    setSelectedProductId(productId);
    setShowDeleteModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  // Xử lý nhập giá tiền — hiển thị có dấu chấm, lưu số thô
  const handlePriceChange = (e) => {
    // Chỉ giữ lại các ký tự số
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (rawDigits === '') {
      setPriceDisplayValue('');
      setFormData(prev => ({ ...prev, retail_price: '' }));
    } else {
      const numericValue = Number(rawDigits);
      setPriceDisplayValue(new Intl.NumberFormat('vi-VN').format(numericValue));
      setFormData(prev => ({ ...prev, retail_price: numericValue }));
    }
    if (errors.retail_price) setErrors(prev => ({ ...prev, retail_price: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.name || String(formData.name).trim() === '') newErrors.name = 'Vui lòng nhập tên sản phẩm.';
    if (!formData.unit || String(formData.unit).trim() === '') newErrors.unit = 'Vui lòng nhập đơn vị tính.';
    if (formData.retail_price === '' || formData.retail_price === undefined || Number(formData.retail_price) < 0) {
      newErrors.retail_price = 'Giá bán lẻ không được để trống hoặc âm.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const dataToSubmit = new FormData();
      dataToSubmit.append('category_id', categoryId);
      dataToSubmit.append('name', String(formData.name).trim());
      dataToSubmit.append('unit', String(formData.unit).trim());
      dataToSubmit.append('retail_price', formData.retail_price);
      if (formData.sku && String(formData.sku).trim() !== '') {
        dataToSubmit.append('sku', String(formData.sku).trim());
      }
      dataToSubmit.append('is_active', formData.is_active !== false && formData.is_active !== 'false');
      if (formData.imageFile) {
        dataToSubmit.append('image', formData.imageFile);
      }
      if (isEditing) {
        await productApi.update(selectedProductId, dataToSubmit);
      } else {
        await productApi.create(dataToSubmit);
      }
      await fetchProducts();
      setShowFormModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      setApiErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra (Mã SKU có thể đã tồn tại).');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await productApi.delete(selectedProductId);
      await fetchProducts();
      setShowDeleteModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Lỗi khi xóa sản phẩm.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="product-management-container">
      {/* ===== HEADER ===== */}
      <div className="pm-header">
        <div className="pm-header-left">
          <button className="btn-back" onClick={() => navigate('/warehouse/categories')} title="Quay lại">
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <h2>Sản phẩm thuộc danh mục: <span>{categoryName}</span></h2>
        </div>

        <div className="pm-header-right">
          {/* Bộ lọc trạng thái */}
          <select
            className="pm-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="INACTIVE">Ngừng bán</option>
          </select>

          {/* Ô tìm kiếm */}
          <div className="pm-search-wrapper">
            <i className="ph ph-magnifying-glass pm-search-icon"></i>
            <input
              type="text"
              className="pm-search-input"
              placeholder="Tìm sản phẩm... (VD: Sting)"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button className="pm-search-clear" onClick={() => setSearchKeyword('')} title="Xóa tìm kiếm">
                <i className="ph ph-x"></i>
              </button>
            )}
          </div>

          {/* Nút quét barcode bằng camera */}
          <button className="btn-scanner" onClick={handleOpenScanner} title="Quét mã barcode">
            <i className="ph-bold ph-barcode"></i>
            <span>Quét mã</span>
          </button>

          <button className="btn-add-green" onClick={handleAddNew}>
            <i className="ph-bold ph-plus"></i> Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* ===== BODY - DANH SÁCH SẢN PHẨM ===== */}
      <div className="pm-body">
        {displayProducts.length === 0 ? (
          <div className="empty-list">
            <i className="ph-fill ph-package" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
            <h3>
              {searchKeyword
                ? `Không tìm thấy sản phẩm "${searchKeyword}"`
                : 'Chưa có sản phẩm nào'}
            </h3>
            <p>
              {searchKeyword
                ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc.'
                : 'Hãy bấm "Thêm sản phẩm" để bắt đầu thiết lập kho hàng.'}
            </p>
          </div>
        ) : (
          <div className="product-list">
            {displayProducts.map(product => (
              <div key={product.product_id} className="product-list-item">
                <div className="product-info">
                  {/* Ảnh đại diện thu nhỏ */}
                  <div className="product-avatar">
                    {product.image_url ? (
                      <img src={getImageSrc(product.image_url)} alt={product.name} style={{ width: '100%', height: '100%', borderRadius: '7px', objectFit: 'cover' }} />
                    ) : (
                      <i className="ph ph-image" style={{ fontSize: '24px' }}></i>
                    )}
                  </div>

                  {/* Thông tin Text */}
                  <div className="product-details">
                    <div className="product-name">{product.name}</div>
                    <div className="product-meta">
                      <span className="price">{formatMoney(product.retail_price)} / {product.unit}</span>
                      <span>• SKU: {product.sku}</span>
                      {product.is_active ? (
                        <span className="status-badge status-active">Đang bán</span>
                      ) : (
                        <span className="status-badge status-inactive">Ngừng bán</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="product-actions">
                  <button
                    className="btn-action-text barcode"
                    onClick={() => handleShowBarcode(product)}
                    title="Xem mã barcode"
                  >
                    <i className="ph ph-barcode"></i> Mã vạch
                  </button>
                  <button
                    className="btn-action-text batch"
                    onClick={() => navigate('/warehouse/product-batches', { state: { productId: product.product_id, productName: product.name } })}
                    title="Quản lý lô hàng"
                  >
                    <i className="ph ph-stack"></i> Lô hàng
                  </button>
                  <button className="btn-action-text edit" onClick={() => handleEdit(product)}>Chỉnh sửa</button>
                  <button className="btn-action-text delete" onClick={() => handleDeleteClick(product.product_id)}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL BARCODE ===== */}
      {showBarcodeModal && barcodeProduct && (
        <div className="modal-overlay" onClick={handleCloseBarcodeModal}>
          <div className="modal-content barcode-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="barcode-modal-header">
              <div className="barcode-modal-title-group">
                <i className="ph-fill ph-barcode barcode-modal-icon"></i>
                <h3>Mã vạch sản phẩm</h3>
              </div>
              <button className="barcode-close-btn" onClick={handleCloseBarcodeModal}>
                <i className="ph ph-x"></i>
              </button>
            </div>

            {/* Product Info */}
            <div className="barcode-product-info">
              <div className="barcode-product-name">{barcodeProduct.name}</div>
              <div className="barcode-product-meta">
                <span className="barcode-category-tag">
                  <i className="ph ph-tag"></i> {categoryName}
                </span>
                <span className="barcode-price-tag">
                  <i className="ph ph-currency-circle-dollar"></i> {formatMoney(barcodeProduct.retail_price)} / {barcodeProduct.unit}
                </span>
              </div>
            </div>

            {/* Barcode Canvas */}
            <div className="barcode-canvas-wrapper">
              <canvas ref={barcodeCanvasRef}></canvas>
            </div>

            {/* Actions */}
            <div className="barcode-modal-actions">
              <button className="btn-download-barcode" onClick={handleDownloadBarcode}>
                <i className="ph-bold ph-download-simple"></i> Tải về PNG
              </button>
              <button className="btn-cancel" onClick={handleCloseBarcodeModal}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL SCANNER CAMERA ===== */}
      {showScannerModal && (
        <div className="modal-overlay" onClick={handleCloseScannerModal}>
          <div className="modal-content scanner-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="scanner-modal-header">
              <div className="scanner-modal-title-group">
                <i className="ph-fill ph-camera scanner-modal-icon"></i>
                <h3>Quét mã barcode</h3>
              </div>
              <button className="barcode-close-btn" onClick={handleCloseScannerModal}>
                <i className="ph ph-x"></i>
              </button>
            </div>

            {/* Hướng dẫn */}
            <p className="scanner-guide">
              Hướng camera vào mã vạch của sản phẩm. Hệ thống sẽ tự động nhận diện và tìm kiếm.
            </p>

            {/* Khung camera */}
            <div className="scanner-video-wrapper">
              {isScanning && !scannerError && (
                <div className="scanner-laser"></div>
              )}
              <video ref={scannerVideoRef} className="scanner-video" autoPlay muted playsInline />
              {!isScanning && !scannerError && (
                <div className="scanner-loading">
                  <div className="scanner-spinner"></div>
                  <span>Đang khởi động camera...</span>
                </div>
              )}
            </div>

            {/* Lỗi */}
            {scannerError && (
              <div className="scanner-error-msg">
                <i className="ph-fill ph-warning-circle"></i> {scannerError}
              </div>
            )}

            <div className="barcode-modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-cancel" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCloseScannerModal}>
                <i className="ph ph-x"></i> Đóng camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÊM / SỬA (CÓ UPLOAD ẢNH) ===== */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', fontWeight: 'bold' }}>
              {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h3>

            {apiErrorMsg && (
              <div style={{ color: '#ef4444', background: '#fee2e2', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'left', fontWeight: '500' }}>
                <i className="ph-fill ph-warning-circle"></i> {apiErrorMsg}
              </div>
            )}

            <div className="modal-form-group pm-full-width" style={{ marginBottom: '16px' }}>
              <label>Tên sản phẩm <span style={{ color: 'red' }}>*</span></label>
              <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="VD: Nước suối Aquafina 500ml" className={errors.name ? 'input-error' : ''} />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="pm-form-grid">
              <div className="modal-form-group">
                <label>Mã SKU (Mã vạch)</label>
                <input type="text" name="sku" value={formData.sku || ''} onChange={handleChange} placeholder="Để trống tự tạo mã..." />
              </div>

              <div className="modal-form-group">
                <label>Đơn vị tính <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="unit" value={formData.unit || ''} onChange={handleChange} placeholder="VD: Lon, Chai, Gói..." className={errors.unit ? 'input-error' : ''} />
                {errors.unit && <span className="error-text">{errors.unit}</span>}
              </div>

              <div className="modal-form-group">
                <label>Giá bán lẻ (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="retail_price"
                  value={priceDisplayValue}
                  onChange={handlePriceChange}
                  placeholder="VD: 10.000"
                  className={errors.retail_price ? 'input-error' : ''}
                />
                {errors.retail_price && <span className="error-text">{errors.retail_price}</span>}
              </div>

              <div className="modal-form-group">
                <label>Trạng thái</label>
                <select name="is_active" value={formData.is_active !== false ? "true" : "false"} onChange={(e) => handleChange({ target: { name: 'is_active', value: e.target.value === 'true' } })}>
                  <option value="true">Đang kinh doanh</option>
                  <option value="false">Ngừng bán</option>
                </select>
              </div>
            </div>

            {/* KHU VỰC UPLOAD ẢNH */}
            <div className="modal-form-group pm-full-width">
              <label>Ảnh đại diện sản phẩm</label>
              <div className="image-upload-wrapper">
                <div className="image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" />
                  ) : (
                    <i className="ph ph-image" style={{ fontSize: '32px', color: '#94a3b8' }}></i>
                  )}
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ border: 'none', padding: '0', fontSize: '14px' }} />
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Kích thước khuyên dùng: Hình vuông (Tỷ lệ 1:1)</p>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" style={{ textAlign: 'center' }} onClick={() => setShowFormModal(false)}>Hủy</button>
              <button className="btn-add-green" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÔNG BÁO THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px' }}>
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px', color: '#10b981' }}></i>
            </div>
            <h3 style={{ marginTop: '16px' }}>Thành công!</h3>
            <p>Hành động của bạn đã được thực hiện thành công.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSuccessModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÓA ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px' }}>
            <div className="modal-icon">
              <i className="ph ph-trash" style={{ fontSize: '54px', color: '#ef4444' }}></i>
            </div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa sản phẩm này khỏi kho hàng không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" style={{ textAlign: 'center' }} onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-action-text delete" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;