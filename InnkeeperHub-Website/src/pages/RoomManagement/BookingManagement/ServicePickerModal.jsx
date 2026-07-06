import { useState, useEffect, useCallback } from 'react';
import bookingServiceItemApi from '../../../api/bookingServiceItemApi';
import { getImageSrc } from '../../../utils/imageUrl';
import './ProductPickerModal.css';

function ServicePickerModal({ bookingId, onAdded, onClose }) {
  const [step, setStep] = useState('category');
  const [categories, setCategories] = useState([]);
  const [services, setServices]     = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [quantities, setQuantities]   = useState({});

  const [loadingCat, setLoadingCat]   = useState(true);
  const [loadingSvc, setLoadingSvc]   = useState(false);
  const [addingId, setAddingId]       = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');
  const [search, setSearch]           = useState('');

  // Toast tự hết sau 1s
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 1000);
  };

  // Lấy categories
  useEffect(() => {
    bookingServiceItemApi.getServiceCategories()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setCategories(list);
      })
      .catch(() => setErrorMsg('Không tải được danh mục dịch vụ.'))
      .finally(() => setLoadingCat(false));
  }, []);

  // Lấy dịch vụ theo category
  const loadServices = useCallback(async (cat) => {
    setSelectedCat(cat);
    setStep('service');
    setSearch('');
    setLoadingSvc(true);
    setErrorMsg('');
    try {
      const res = await bookingServiceItemApi.getServicesByCategory(cat);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setServices(list);
      const init = {};
      list.forEach((s) => { init[s.service_id] = 1; });
      setQuantities(init);
    } catch {
      setErrorMsg('Không tải được dịch vụ.');
    } finally {
      setLoadingSvc(false);
    }
  }, []);

  // Thêm dịch vụ vào phiên thuê
  const handleAdd = async (svc) => {
    const qty = quantities[svc.service_id] || 1;
    setAddingId(svc.service_id);
    try {
      const res = await bookingServiceItemApi.addGeneralItem(bookingId, {
        service_id:   svc.service_id,
        service_name: svc.name,
        price:        svc.price,
        unit:         svc.unit,
        quantity:     qty,
      });
      const item = res?.data ?? res;
      onAdded(item);
      showToast('success', `Đã thêm ${qty} ${svc.unit} ${svc.name}`);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Thêm thất bại.');
    } finally {
      setAddingId(null);
    }
  };

  const setQty = (id, val) => {
    const n = Math.max(1, parseInt(val, 10) || 1);
    setQuantities((prev) => ({ ...prev, [id]: n }));
  };

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatMoney = (n) =>
    n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

  return (
    <div className="ppm-overlay" onClick={onClose}>
      <div className="ppm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="ppm-header">
          {step === 'service' && (
            <button className="ppm-back-btn" onClick={() => setStep('category')}>
              <i className="ph-bold ph-arrow-left" />
            </button>
          )}
          <div className="ppm-header-text">
            <h2 className="ppm-title">
              {step === 'category' ? 'Chọn danh mục dịch vụ' : selectedCat}
            </h2>
            {step === 'service' && (
              <p className="ppm-sub">Chọn dịch vụ và số lượng</p>
            )}
          </div>
          <button className="ppm-close-btn" onClick={onClose}>
            <i className="ph-bold ph-x" />
          </button>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`ppm-toast ppm-toast--${toast.type}`}>
            {toast.msg}
          </div>
        )}

        {/* ── ERROR ── */}
        {errorMsg && (
          <div className="ppm-error">
            <i className="ph-bold ph-warning-circle" /> {errorMsg}
          </div>
        )}

        {/* ══ BƯỚC 1: DANH MỤC ══ */}
        {step === 'category' && (
          <div className="ppm-body">
            {loadingCat ? (
              <div className="ppm-loading">Đang tải danh mục...</div>
            ) : categories.length === 0 ? (
              <p className="ppm-empty-text">Chưa có danh mục nào.</p>
            ) : (
              <div className="ppm-cat-grid">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className="ppm-cat-item"
                    onClick={() => loadServices(cat)}
                  >
                    <span className="ppm-cat-name">{cat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ BƯỚC 2: DANH SÁCH DỊCH VỤ ══ */}
        {step === 'service' && (
          <>
            <div className="ppm-search-wrap">
              <i className="ph-bold ph-magnifying-glass ppm-search-icon" />
              <input
                className="ppm-search-input"
                placeholder="Tìm tên dịch vụ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="ppm-body">
              {loadingSvc ? (
                <div className="ppm-loading">Đang tải dịch vụ...</div>
              ) : filtered.length === 0 ? (
                <p className="ppm-empty-text">Không có dịch vụ nào.</p>
              ) : (
                <div className="ppm-product-list">
                  {filtered.map((svc) => {
                    const isAdding = addingId === svc.service_id;
                    const qty = quantities[svc.service_id] || 1;

                    return (
                      <div key={svc.service_id} className="ppm-product-item">
                        {/* Ảnh */}
                        <div className="ppm-product-img-wrap">
                          {svc.image_url ? (
                            <img
                              src={getImageSrc(svc.image_url)}
                              alt={svc.name}
                              className="ppm-product-img"
                            />
                          ) : (
                            <div className="ppm-product-img-placeholder" />
                          )}
                        </div>

                        {/* Thông tin */}
                        <div className="ppm-product-info">
                          <span className="ppm-product-name">{svc.name}</span>
                          {svc.description && (
                            <span className="ppm-product-sku">{svc.description}</span>
                          )}
                          <div className="ppm-product-meta">
                            <span className="ppm-product-price">
                              {formatMoney(svc.price)}
                            </span>
                            <span className="ppm-stock">/ {svc.unit}</span>
                          </div>
                        </div>

                        {/* Qty + Thêm */}
                        <div className="ppm-product-action">
                          <div className="ppm-qty-ctrl">
                            <button
                              className="ppm-qty-btn"
                              onClick={() => setQty(svc.service_id, qty - 1)}
                              disabled={qty <= 1}
                            >−</button>
                            <input
                              className="ppm-qty-input"
                              type="number"
                              min="1"
                              value={qty}
                              onChange={(e) => setQty(svc.service_id, e.target.value)}
                            />
                            <button
                              className="ppm-qty-btn"
                              onClick={() => setQty(svc.service_id, qty + 1)}
                            >+</button>
                          </div>
                          <button
                            className="ppm-add-btn"
                            disabled={isAdding}
                            onClick={() => handleAdd(svc)}
                          >
                            {isAdding
                              ? <i className="ph-bold ph-spinner ppm-spin" />
                              : <>Thêm</>
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default ServicePickerModal;
