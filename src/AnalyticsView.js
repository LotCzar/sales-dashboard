import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import './App.css';

// Status colors matching the badge colors
const STATUS_COLORS = {
  'Paid': '#2ecc71',          // Green
  'Partially Paid': '#f5a623', // Orange/Yellow
  'Unpaid': '#e74c3c'         // Red
};

// Other chart colors
const CHART_COLORS = ['#4a90e2', '#9b59b6', '#f39c12', '#16a085', '#34495e'];

const HomeView = ({ companyId }) => {
  const [invoices, setInvoices] = useState([]);
  const [repMap, setRepMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      try {
        const invoiceSnapshot = await getDocs(collection(db, 'companies', companyId, 'reports'));
        const allInvoices = invoiceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInvoices(allInvoices);
        // Fetch rep names
        const repUids = [...new Set(allInvoices.map(i => i.createdBy).filter(Boolean))];
        const repEntries = await Promise.all(repUids.map(async (uid) => {
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            return [uid, data.repName || uid];
          } else {
            return [uid, uid];
          }
        }));
        setRepMap(Object.fromEntries(repEntries));
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Summary metrics
  const totalSales = invoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const totalInvoices = invoices.length;
  const outstandingBalance = invoices.reduce((sum, i) => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const totalPaid = (i.totalPaid || 0) + initialPaid;
    return sum + (parseFloat(i.amount || 0) - totalPaid);
  }, 0);
  const overdueInvoices = invoices.filter(i => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const totalPaid = (i.totalPaid || 0) + initialPaid;
    return (parseFloat(i.amount || 0) - totalPaid) > 0 && i.date?.seconds && new Date(i.date.seconds * 1000) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }).length;

  // Sales over time (by month)
  const salesByMonth = {};
  invoices.forEach(i => {
    if (i.date?.seconds) {
      const d = new Date(i.date.seconds * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      salesByMonth[key] = (salesByMonth[key] || 0) + (parseFloat(i.amount) || 0);
    }
  });
  const salesOverTime = Object.entries(salesByMonth).map(([month, amount]) => ({ month, amount }));

  // Sales by region
  const regionMap = {};
  invoices.forEach(i => {
    if (i.region) regionMap[i.region] = (regionMap[i.region] || 0) + (parseFloat(i.amount) || 0);
  });
  const salesByRegion = Object.entries(regionMap).map(([region, amount]) => ({ region, amount }));

  // Top reps
  const repSales = {};
  invoices.forEach(i => {
    if (i.createdBy) repSales[i.createdBy] = (repSales[i.createdBy] || 0) + (parseFloat(i.amount) || 0);
  });
  const topReps = Object.entries(repSales).map(([uid, amount]) => ({ rep: repMap[uid] || uid, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Top stores
  const storeSales = {};
  invoices.forEach(i => {
    if (i.store) storeSales[i.store] = (storeSales[i.store] || 0) + (parseFloat(i.amount) || 0);
  });
  const topStores = Object.entries(storeSales).map(([store, amount]) => ({ store, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Invoice status breakdown
  const statusCounts = { Paid: 0, 'Partially Paid': 0, Unpaid: 0 };
  invoices.forEach(i => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const paid = (i.totalPaid || 0) + initialPaid;
    const amt = parseFloat(i.amount) || 0;
    if (paid >= amt && amt > 0) statusCounts.Paid++;
    else if (paid > 0 && paid < amt) statusCounts['Partially Paid']++;
    else statusCounts.Unpaid++;
  });
  const statusData = Object.entries(statusCounts).map(([status, value]) => ({ status, value }));

  // Recent activity
  const recentInvoices = [...invoices].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 7);

  // Helper to get invoice status considering initial payment
  const getInvoiceStatus = (inv) => {
    const initialPaid = inv.initialPayment && inv.initialPayment.amount ? parseFloat(inv.initialPayment.amount) : 0;
    const paid = (inv.totalPaid || 0) + initialPaid;
    const amt = parseFloat(inv.amount) || 0;
    if (paid >= amt && amt > 0) return 'Paid';
    if (paid > 0 && paid < amt) return 'Partially Paid';
    return 'Unpaid';
  };

  // Invoice Aging Buckets
  const agingBuckets = {
    'Current': 0,
    '1-30 Days': 0,
    '31-60 Days': 0,
    '61-90 Days': 0,
    '90+ Days': 0
  };
  invoices.forEach(i => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const totalPaid = (i.totalPaid || 0) + initialPaid;
    const amt = parseFloat(i.amount) || 0;
    if (amt - totalPaid <= 0) {
      agingBuckets['Current']++;
      return;
    }
    if (!i.date?.seconds) return;
    const daysOverdue = Math.floor((Date.now() - i.date.seconds * 1000) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 30) agingBuckets['1-30 Days']++;
    else if (daysOverdue <= 60) agingBuckets['31-60 Days']++;
    else if (daysOverdue <= 90) agingBuckets['61-90 Days']++;
    else agingBuckets['90+ Days']++;
  });
  const agingData = Object.entries(agingBuckets).map(([bucket, value]) => ({ bucket, value }));

  // Average Days to Payment
  let totalDaysToPayment = 0;
  let paidInvoiceCount = 0;
  invoices.forEach(i => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const totalPaid = (i.totalPaid || 0) + initialPaid;
    const amt = parseFloat(i.amount) || 0;
    if (amt > 0 && totalPaid >= amt && i.date?.seconds) {
      // Use lastPaymentDate if available, else fallback to date
      let lastPaymentDate = i.lastPaymentDate?.seconds
        ? new Date(i.lastPaymentDate.seconds * 1000)
        : new Date(i.date.seconds * 1000);
      const invoiceDate = new Date(i.date.seconds * 1000);
      const days = Math.floor((lastPaymentDate - invoiceDate) / (1000 * 60 * 60 * 24));
      totalDaysToPayment += days;
      paidInvoiceCount++;
    }
  });
  const avgDaysToPayment = paidInvoiceCount > 0 ? (totalDaysToPayment / paidInvoiceCount).toFixed(1) : '—';

  // New Stores Over Time
  const [storesByMonth, setStoresByMonth] = useState([]);
  useEffect(() => {
    if (!companyId) return;
    const fetchStores = async () => {
      try {
        const regionSnapshot = await getDocs(collection(db, 'companies', companyId, 'regions'));
        const storeDates = [];
        regionSnapshot.forEach(docSnap => {
          const { stores = {} } = docSnap.data();
          Object.values(stores).forEach(regionStores => {
            regionStores.forEach(store => {
              if (store.createdAt?.seconds) {
                const d = new Date(store.createdAt.seconds * 1000);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                storeDates.push(key);
              }
            });
          });
        });
        const monthCounts = {};
        storeDates.forEach(key => { monthCounts[key] = (monthCounts[key] || 0) + 1; });
        setStoresByMonth(Object.entries(monthCounts).map(([month, count]) => ({ month, count })));
      } catch (err) {
        setStoresByMonth([]);
      }
    };
    fetchStores();
  }, [companyId]);

  // Payment Collection Rate
  let paidOnTime = 0, paidLate = 0;
  invoices.forEach(i => {
    const initialPaid = i.initialPayment && i.initialPayment.amount ? parseFloat(i.initialPayment.amount) : 0;
    const totalPaid = (i.totalPaid || 0) + initialPaid;
    const amt = parseFloat(i.amount) || 0;
    if (amt > 0 && totalPaid >= amt && i.date?.seconds) {
      let lastPaymentDate = i.lastPaymentDate?.seconds
        ? new Date(i.lastPaymentDate.seconds * 1000)
        : new Date(i.date.seconds * 1000);
      const invoiceDate = new Date(i.date.seconds * 1000);
      const days = Math.floor((lastPaymentDate - invoiceDate) / (1000 * 60 * 60 * 24));
      if (days <= 30) paidOnTime++;
      else paidLate++;
    }
  });
  const collectionRateData = [
    { name: 'Paid On Time', value: paidOnTime },
    { name: 'Paid Late', value: paidLate }
  ];

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>Loading analytics...</p></div>;
  if (error) return <div className="error-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="analytics-container">
      <section className="dashboard-summary">
        <div className="summary-card"><h3>Total Sales</h3><p>${totalSales.toLocaleString()}</p></div>
        <div className="summary-card"><h3>Total Invoices</h3><p>{totalInvoices}</p></div>
        <div className="summary-card"><h3>Outstanding</h3><p>${outstandingBalance.toLocaleString()}</p></div>
        <div className="summary-card"><h3>Overdue Invoices</h3><p>{overdueInvoices}</p></div>
      </section>
      <div className="analytics-charts-grid">
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Sales Over Time</h4>
            <span className="info-tooltip" title="Total sales amount by month.">ℹ️</span>
          </div>
          <div className="chart-description">Total sales amount by month.</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#4a90e2" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Sales by Region</h4>
            <span className="info-tooltip" title="Total sales grouped by region.">ℹ️</span>
          </div>
          <div className="chart-description">Total sales grouped by region.</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByRegion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#2ecc71" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Top Reps</h4>
            <span className="info-tooltip" title="Top 5 sales reps by total sales.">ℹ️</span>
          </div>
          <div className="chart-description">Top 5 sales reps by total sales.</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topReps} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="rep" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#f5a623" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Top Stores</h4>
            <span className="info-tooltip" title="Top 5 stores by total sales.">ℹ️</span>
          </div>
          <div className="chart-description">Top 5 stores by total sales.</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topStores} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="store" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#9b59b6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Invoice Status Breakdown</h4>
            <span className="info-tooltip" title="Distribution of invoices by payment status.">ℹ️</span>
          </div>
          <div className="chart-description">Distribution of invoices by payment status.</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie 
                data={statusData} 
                dataKey="value" 
                nameKey="status" 
                cx="50%" 
                cy="50%" 
                outerRadius={70} 
                label
              >
                {statusData.map((entry) => (
                  <Cell 
                    key={entry.status} 
                    fill={STATUS_COLORS[entry.status]} 
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Invoice Aging</h4>
            <span className="info-tooltip" title="Shows how many invoices are current or overdue by various time buckets.">ℹ️</span>
          </div>
          <div className="chart-description">Shows how many invoices are current or overdue by various time buckets.</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#e67e22" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* New row for additional charts */}
      <div className="analytics-charts-grid">
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Average Days to Payment</h4>
            <span className="info-tooltip" title="Average number of days it takes for invoices to be paid in full.">ℹ️</span>
          </div>
          <div className="chart-description">Average number of days it takes for invoices to be paid in full.</div>
          <div style={{ fontSize: 48, fontWeight: 700, textAlign: 'center', marginTop: 40 }}>{avgDaysToPayment}</div>
          <div style={{ textAlign: 'center', color: '#888' }}>days</div>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>New Stores Over Time</h4>
            <span className="info-tooltip" title="Number of new stores added each month.">ℹ️</span>
          </div>
          <div className="chart-description">Number of new stores added each month.</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={storesByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#16a085" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="analytics-chart-card">
          <div className="chart-header-row">
            <h4>Payment Collection Rate</h4>
            <span className="info-tooltip" title="Percentage of invoices paid on time (within 30 days) vs. late.">ℹ️</span>
          </div>
          <div className="chart-description">Percentage of invoices paid on time (within 30 days) vs. late.</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie 
                data={collectionRateData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={70} 
                label
              >
                <Cell key="onTime" fill="#2ecc71" />
                <Cell key="late" fill="#e74c3c" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="recent-activity">
        <h4>Recent Activity</h4>
        <div className="recent-activity-list">
          {recentInvoices.map(invoice => {
            const status = getInvoiceStatus(invoice);
            return (
              <div key={invoice.id} className="recent-activity-item">
                <div className="activity-details">
                  <span className="activity-store">{invoice.store}</span>
                  <span className="activity-date">
                    {invoice.date?.seconds ? new Date(invoice.date.seconds * 1000).toLocaleDateString() : 'No date'}
                  </span>
                  <span className={`activity-status ${status.toLowerCase().replace(' ', '-')}`}>
                    {status}
                  </span>
                </div>
                <span className="activity-amount">${parseFloat(invoice.amount || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomeView; 