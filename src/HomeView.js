import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function HomeView({ companyId }) {
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalInvoices: 0,
    outstandingAmount: 0,
    overdueAmount: 0
  });
  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: [{
      label: 'Sales',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  });
  const [regionData, setRegionData] = useState({
    labels: [],
    datasets: [{
      label: 'Sales by Region',
      data: [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
      ]
    }]
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch invoices
        const invoicesQuery = query(
          collection(db, 'companies', companyId, 'invoices'),
          where('status', '!=', 'deleted')
        );
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoices = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate summary
        const totalSales = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalInvoices = invoices.length;
        const outstandingAmount = invoices
          .filter(inv => inv.status === 'pending')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const overdueAmount = invoices
          .filter(inv => inv.status === 'overdue')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);

        setSummary({
          totalSales,
          totalInvoices,
          outstandingAmount,
          overdueAmount
        });

        // Prepare sales over time data
        const salesByDate = {};
        invoices.forEach(inv => {
          const date = new Date(inv.date).toLocaleDateString();
          salesByDate[date] = (salesByDate[date] || 0) + (inv.amount || 0);
        });

        setSalesData({
          labels: Object.keys(salesByDate),
          datasets: [{
            label: 'Sales',
            data: Object.values(salesByDate),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        });

        // Prepare region data
        const salesByRegion = {};
        invoices.forEach(inv => {
          if (inv.region) {
            salesByRegion[inv.region] = (salesByRegion[inv.region] || 0) + (inv.amount || 0);
          }
        });

        setRegionData({
          labels: Object.keys(salesByRegion),
          datasets: [{
            label: 'Sales by Region',
            data: Object.values(salesByRegion),
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)'
            ]
          }]
        });

        // Get recent invoices
        const sortedInvoices = [...invoices]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        setRecentInvoices(sortedInvoices);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-view">
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Sales</h3>
          <p>${summary.totalSales.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Total Invoices</h3>
          <p>{summary.totalInvoices}</p>
        </div>
        <div className="summary-card">
          <h3>Outstanding</h3>
          <p>${summary.outstandingAmount.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Overdue</h3>
          <p>${summary.overdueAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sales Over Time</h3>
          <Line data={salesData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              }
            }
          }} />
        </div>
        <div className="chart-card">
          <h3>Sales by Region</h3>
          <Pie data={regionData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              }
            }
          }} />
        </div>
      </div>

      <div className="recent-invoices">
        <h3>Recent Invoices</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Store</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>{new Date(invoice.date).toLocaleDateString()}</td>
                  <td>{invoice.store}</td>
                  <td>${invoice.amount?.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default HomeView; 