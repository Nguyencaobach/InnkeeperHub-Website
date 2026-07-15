import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import revenueApi from './../../../api/revenueApi';
import './RevenueDashboard.css';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rev-custom-tooltip">
        <p className="rev-tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="rev-tooltip-item" style={{ color: entry.color }}>
            {entry.name}: {Number(entry.value).toLocaleString('vi-VN')} đ
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RevenueDashboard = () => {
  const [filter, setFilter] = useState('7days'); // 'today', '7days', '30days'
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [paymentDist, setPaymentDist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      let groupBy = 'day';

      if (filter === 'today') {
        start.setHours(0, 0, 0, 0);
        groupBy = 'day';
      } else if (filter === '7days') {
        start.setDate(end.getDate() - 6);
        groupBy = 'day';
      } else if (filter === '30days') {
        start.setDate(end.getDate() - 29);
        groupBy = 'day';
      }

      // Format ISO string for API
      const startDate = start.toISOString();
      const endDate = end.toISOString();

      const [resSummary, resTimeline, resPayment] = await Promise.all([
        revenueApi.getSummary(startDate, endDate),
        revenueApi.getRevenueTimeline(startDate, endDate, groupBy),
        revenueApi.getPaymentMethodsDist(startDate, endDate)
      ]);

      setSummary(resSummary.data);
      
      // Format timeline data for Recharts
      const formattedTimeline = (resTimeline.data || []).map(item => {
        const dateObj = new Date(item.date_group);
        return {
          name: `${dateObj.getDate()}/${dateObj.getMonth() + 1}`,
          "Doanh thu": Number(item.revenue)
        };
      });
      setTimeline(formattedTimeline);

      // Format pie chart data
      const formattedPayment = (resPayment.data || []).map(item => ({
        name: item.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
        value: Number(item.amount)
      }));
      setPaymentDist(formattedPayment);

    } catch (error) {
      console.error("Lỗi lấy dữ liệu doanh thu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [filter]);

  if (isLoading && !summary) {
    return <div className="revenue-dashboard-container">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="revenue-dashboard-container">
      {/* HEADER */}
      <div className="rev-header">
        <h1 className="rev-title">
          <i className="ph-fill ph-chart-line-up rev-title-icon" />
          Tổng quan Doanh Thu
        </h1>
        <div className="rev-filters">
          <button 
            className={`rev-filter-btn ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            Hôm nay
          </button>
          <button 
            className={`rev-filter-btn ${filter === '7days' ? 'active' : ''}`}
            onClick={() => setFilter('7days')}
          >
            7 Ngày qua
          </button>
          <button 
            className={`rev-filter-btn ${filter === '30days' ? 'active' : ''}`}
            onClick={() => setFilter('30days')}
          >
            30 Ngày qua
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="rev-summary-grid">
        <div className="rev-summary-card">
          <div className="rev-card-icon-wrap icon-blue">
            <i className="ph-bold ph-coins" />
          </div>
          <div className="rev-card-info">
            <span className="rev-card-label">Tổng doanh thu</span>
            <span className="rev-card-value">
              {Number(summary?.total_revenue || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
        
        <div className="rev-summary-card">
          <div className="rev-card-icon-wrap icon-green">
            <i className="ph-bold ph-bed" />
          </div>
          <div className="rev-card-info">
            <span className="rev-card-label">Tiền phòng</span>
            <span className="rev-card-value">
              {Number(summary?.total_room_revenue || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-card-icon-wrap icon-purple">
            <i className="ph-bold ph-coffee" />
          </div>
          <div className="rev-card-info">
            <span className="rev-card-label">Tiền dịch vụ</span>
            <span className="rev-card-value">
              {Number(summary?.total_service_revenue || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="rev-summary-card">
          <div className="rev-card-icon-wrap icon-orange">
            <i className="ph-bold ph-receipt" />
          </div>
          <div className="rev-card-info">
            <span className="rev-card-label">Tổng số hoá đơn</span>
            <span className="rev-card-value">
              {Number(summary?.total_bills || 0).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="rev-charts-container">
        {/* Line Chart */}
        <div className="rev-chart-card">
          <div className="rev-chart-header">
            <h3 className="rev-chart-title">Biểu đồ Doanh thu</h3>
          </div>
          <div className="rev-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toLocaleString('vi-VN')}k`}
                  dx={-10}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="Doanh thu" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="rev-chart-card">
          <div className="rev-chart-header">
            <h3 className="rev-chart-title">Phương thức thanh toán</h3>
          </div>
          <div className="rev-chart-wrapper">
            {paymentDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {paymentDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} đ`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Chưa có dữ liệu thanh toán
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
