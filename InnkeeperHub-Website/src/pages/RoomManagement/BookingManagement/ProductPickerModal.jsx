import { useState, useEffect, useCallback } from 'react';
import categoryApi from '../../../api/productCategoryApi';
import bookingServiceItemApi from '../../../api/bookingServiceItemApi';
import { getImageSrc } from '../../../utils/imageUrl';
import './ProductPickerModal.css';

function ProductPickerModal({ bookingId, onAdded, onClose }) {
  // ── BƯỚC: 'category' | 'product' ──────────────────────────────
  const [step, setStep] = useState('category');

  // ── DỮ LIỆU ───────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);

  // ── SỐ LƯỢNG CHỌN CỦA TỪNG SẢN PHẨM ─────────────────────────
  const [quantities, setQuantities] = useState({});

  // ── TRẠNG THÁI UI ─────────────────────────────────────────────
  const [loadingCat, setLoadingCat]     = useState(true);
  const [loadingProd, setLoadingProd]   = useState(false);
  const [addingId, setAddingId]         = useState(null);
  const [errorMsg, setErrorMsg]         = useState('');

  // ── TOAST (tự hết sau 1s) ─────────────────────────────────────
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 1000);
  };

  // ── SEARCH ───────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // Lấy danh mục khi mở modal
  useEffect(() => {
    categoryApi.getAll()
      .then((res) => {
        // API dùng sendSuccess wrapper: { success, data: [...] }
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setCategories(list);
      })
      .catch(() => setErrorMsg('Không tải được danh mục.'))
      .finally(() => setLoadingCat(false));
  }, []);

  // Lấy sản phẩm khi chọn danh mục
  const loadProducts = useCallback(async (cat) => {
    setSelectedCat(cat);
    setStep('product');
    setSearch('');
    setLoadingProd(true);
    setErrorMsg('');
    try {
      const res = await bookingServiceItemApi.getProductsByCategory(cat.category_id);
      // API dùng sendSuccess wrapper: { success, data: [...] }
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setProducts(list);
      const init = {};
      list.forEach((p) => { init[p.product_id] = 1; });
      setQuantities(init);
    } catch {
      setErrorMsg('Không tải được sản phẩm.');
    } finally {
      setLoadingProd(false);
    }
  }, []);

  // Thêm sản phẩm vào phiên thuê
  const handleAdd = async (product) => {
    const qty = quantities[product.product_id] || 1;
    if (qty < 1) return;
    setAddingId(product.product_id);
    try {
      const res = await bookingServiceItemApi.addInventoryItem(bookingId, {
        product_id: product.product_id,
        quantity: qty,
      });
      const item = res?.data ?? res;
      onAdded(item);
      showToast('success', `Đã thêm ${qty} ${product.unit} ${product.name}`);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Thêm thất bại.');
    } finally {
      setAddingId(null);
    }
  };

  const setQty = (productId, val) => {
    const n = Math.max(1, parseInt(val, 10) || 1);
    setQuantities((prev) => ({ ...prev, [productId]: n }));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const formatMoney = (n) =>
    n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

  return (
    <div className="ppm-overlay" onClick={onClose}>
      <div className="ppm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="ppm-header">
          {step === 'product' && (
            <button className="ppm-back-btn" onClick={() => setStep('category')}>
              <i className="ph-bold ph-arrow-left" />
            </button>
          )}
          <div className="ppm-header-text">
            <h2 className="ppm-title">
              {step === 'category' ? 'Chọn danh mục hàng hóa' : selectedCat?.name}
            </h2>
            {step === 'product' && (
              <p className="ppm-sub">Chọn sản phẩm và số lượng cần thêm</p>
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

        {/* ── ERROR (load danh mục/sản phẩm) ── */}
        {errorMsg && (
          <div className="ppm-error">
            <i className="ph-bold ph-warning-circle" /> {errorMsg}
          </div>
        )}

        {/* ══ BƯỚC 1: CHỌN DANH MỤC ══ */}
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
                    key={cat.category_id}
                    className="ppm-cat-item"
                    onClick={() => loadProducts(cat)}
                  >
                    <span className="ppm-cat-name">{cat.name}</span>
                    {cat.description && (
                      <span className="ppm-cat-desc">{cat.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ BƯỚC 2: CHỌN SẢN PHẨM ══ */}
        {step === 'product' && (
          <>
            {/* Search */}
            <div className="ppm-search-wrap">
              <i className="ph-bold ph-magnifying-glass ppm-search-icon" />
              <input
                className="ppm-search-input"
                placeholder="Tìm tên hoặc mã SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="ppm-body">
              {loadingProd ? (
              <div className="ppm-loading">Đang tải sản phẩm...</div>
            ) : filteredProducts.length === 0 ? (
              <p className="ppm-empty-text">Không có sản phẩm nào.</p>
            ) : (
                <div className="ppm-product-list">
                  {filteredProducts.map((product) => {
                    const stock = parseInt(product.total_stock, 10);
                    const outOfStock = stock === 0;
                    const isAdding = addingId === product.product_id;
                    const qty = quantities[product.product_id] || 1;

                    return (
                      <div
                        key={product.product_id}
                        className={`ppm-product-item ${outOfStock ? 'ppm-product-item--oos' : ''}`}
                      >
                        {/* Ảnh sản phẩm */}
                        <div className="ppm-product-img-wrap">
                          {product.image_url ? (
                            <img
                              src={getImageSrc(product.image_url)}
                              alt={product.name}
                              className="ppm-product-img"
                            />
                          ) : (
                            <div className="ppm-product-img-placeholder" />
                          )}
                          {outOfStock && (
                            <div className="ppm-oos-badge">Hết hàng</div>
                          )}
                        </div>

                        {/* Thông tin */}
                        <div className="ppm-product-info">
                          <span className="ppm-product-name">{product.name}</span>
                          <span className="ppm-product-sku">SKU: {product.sku}</span>
                          <div className="ppm-product-meta">
                            <span className="ppm-product-price">
                              {formatMoney(product.retail_price)}
                            </span>
                            <span className={`ppm-stock ${outOfStock ? 'ppm-stock--oos' : ''}`}>
                              Còn: {stock} {product.unit}
                            </span>
                          </div>
                        </div>

                        {/* Số lượng + Thêm */}
                        <div className="ppm-product-action">
                          <div className="ppm-qty-ctrl">
                            <button
                              className="ppm-qty-btn"
                              onClick={() => setQty(product.product_id, qty - 1)}
                              disabled={outOfStock || qty <= 1}
                            >−</button>
                            <input
                              className="ppm-qty-input"
                              type="number"
                              min="1"
                              max={stock}
                              value={qty}
                              disabled={outOfStock}
                              onChange={(e) => setQty(product.product_id, e.target.value)}
                            />
                            <button
                              className="ppm-qty-btn"
                              onClick={() => setQty(product.product_id, qty + 1)}
                              disabled={outOfStock || qty >= stock}
                            >+</button>
                          </div>
                          <button
                            className="ppm-add-btn"
                            disabled={outOfStock || isAdding}
                            onClick={() => handleAdd(product)}
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

export default ProductPickerModal;
