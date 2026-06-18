import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage/HomePage';
import RoomTypeSettings from './pages/RoomManagement/RoomTypeSettings/RoomTypeSettings';
import RoomDetail from './pages/RoomManagement/RoomDetail/RoomDetail';
import RoomTypeOverview from "./pages/RoomManagement/RoomTypeOverview/RoomTypeOverview.jsx";
import RoomDetailOverview from "./pages/RoomManagement/RoomDetailOverview/RoomDetailOverview.jsx";
import CreateBooking from "./pages/RoomManagement/BookingManagement/CreateBooking.jsx";
import ViewBooking from "./pages/RoomManagement/BookingManagement/ViewBooking.jsx";
import BookingServices from "./pages/RoomManagement/BookingManagement/BookingServices.jsx";
import PaymentOverview from "./pages/RoomManagement/BookingManagement/PaymentOverview.jsx";
import StaffManagement from './pages/StaffManagement/StaffManagement';
import CustomerManagement from './pages/CustomerManagement/CustomerManagement';
import ProductCategory from './pages/WarehouseManagement/ProductCategory/ProductCategory';
import Products from './pages/WarehouseManagement/Products/Products';
import ProductBatches from './pages/WarehouseManagement/ProductBatches/ProductBatches';
import Discount from './pages/ServiceManagement/Discount/Discount';
import AdditionalServices from './pages/ServiceManagement/AdditionalServices/AdditionalServices';
import AccountActivity from './pages/AccountActivity/AccountActivity';
import RoomInvoiceLog from './pages/AccountActivity/RoomInvoiceLog';
import WarehouseStatus from './pages/Dashboard/WarehouseStatus/WarehouseStatus';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import NgrokGate from './components/NgrokGate/NgrokGate';


function App() {
  return (
    <NgrokGate>
      <BrowserRouter>
        <Routes>
          {/* Route không có layout */}
          <Route path="/login" element={<LoginPage />} />

          {/* Cụm Route ĐƯỢC BỌC BỞI LAYOUT */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/rooms/settings" element={<RoomTypeSettings />} />
            <Route path="/rooms/details/:id" element={<RoomDetail />} />
            <Route path="rooms/activities" element={<RoomTypeOverview />} />
            <Route path="rooms/activities/list/:id" element={<RoomDetailOverview />} />
            <Route path="rooms/activities/list/:id/create-booking" element={<CreateBooking />} />
            <Route path="rooms/activities/list/:id/view-booking" element={<ViewBooking />} />
            <Route path="rooms/activities/list/:id/booking-services" element={<BookingServices />} />
            <Route path="rooms/activities/list/:id/payment-overview" element={<PaymentOverview />} />
            <Route path="/staff-management/account" element={<StaffManagement />} />
            <Route path="/staff-management/timekeeping" element={<StaffManagement />} />
            <Route path="/customers" element={<CustomerManagement />} />
            <Route path="/warehouse/categories" element={<ProductCategory />} />
            <Route path="/warehouse/products" element={<Products />} />
            <Route path="/warehouse/product-batches" element={<ProductBatches />} />
            <Route path="/services/discount" element={<Discount />} />
            <Route path="/services/additional" element={<AdditionalServices />} />
            <Route path="/records/account-logs" element={<AccountActivity />} />
            <Route path="/records/room-invoices" element={<RoomInvoiceLog />} />
            <Route path="/dashboard/warehouse-status" element={<WarehouseStatus />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Mặc định: chuyển về dashboard hoặc login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </NgrokGate>
  );
}

export default App;