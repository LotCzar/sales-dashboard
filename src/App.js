import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './App.css';
import Login from './Login.js';
import InvoicesView from './PaymentsView.js';
import StoreManagerView from './StoreManagerView.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import Register from './Register.js';
import RepManager from './RepManager.js';
import ReportsView from './ReportsView.js';
import HomeView from './AnalyticsView.js';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import MobileNav from './components/MobileNav.js';

function App() {
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedRep, setSelectedRep] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reports, setReports] = useState([]);
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "");
  const [regionStoreMap, setRegionStoreMap] = useState({});
  const [showRegister, setShowRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const companyId = localStorage.getItem('companyId');
  const [summary, setSummary] = useState({});
  const [regions, setRegions] = useState([]);
  const [stores, setStores] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId) return;
    const fetchData = async () => {
      try {
        const reportSnapshot = await getDocs(collection(db, "companies", companyId, "reports"));
        const allReports = reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReports(allReports);

        const regionSnapshot = await getDocs(collection(db, "companies", companyId, "regions"));
        const regionMap = {};
        regionSnapshot.forEach(doc => {
          const { stores = {} } = doc.data();
          Object.entries(stores).forEach(([region, regionStores]) => {
            if (!regionMap[region]) regionMap[region] = [];
            regionMap[region].push(...regionStores);
          });
        });
        setRegionStoreMap(regionMap);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const allStores = Object.values(regionStoreMap).flat().filter(Boolean);
  const filteredReports = reports
    .filter(r => !selectedStore || r.store === selectedStore)
    .filter(r => !selectedRep || r.repName === selectedRep)
    .filter(r => !selectedRegion || r.region === selectedRegion)
    .filter(r => !dateFrom || new Date(r.date?.seconds * 1000 || 0) >= new Date(dateFrom))
    .filter(r => !dateTo || new Date(r.date?.seconds * 1000 || 0) <= new Date(dateTo));

  const handleExportReports = () => {
    const headers = ["Date", "Rep", "Store", "Region", "Sample Tier", "Order Dropped", "Invoice #", "Invoice Total"];
    const rows = filteredReports.map(report => [
      report.date?.seconds ? new Date(report.date.seconds * 1000).toLocaleString() : '',
      report.repName || '',
      report.store || '',
      report.region || '',
      report.sampleTier || '',
      report.orderDropped ? "Yes" : "No",
      report.invoiceNumber || '',
      report.invoiceTotal || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${companyName}_filtered_reports.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!companyName) {
    return showRegister ? (
      <Register 
        onRegister={() => {
          setCompanyName(localStorage.getItem("companyName"));
        }}
        onBackToLogin={() => setShowRegister(false)}
      />
    ) : (
      <Login 
        onLogin={() => {
          setCompanyName(localStorage.getItem("companyName"));
        }}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="desktop-nav">
          <NavLink to="/" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>Home</NavLink>
          <NavLink to="/reports" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>Reports</NavLink>
          <NavLink to="/invoices" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>Invoices</NavLink>
          <NavLink to="/stores" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>Store Manager</NavLink>
          <NavLink to="/reps" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>Manage Reps</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
                </div>
                <div className="dashboard-controls">
                  <button onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
                </div>
              </header>
              <HomeView companyId={companyId} />
            </div>
          } />
          <Route path="/reports" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
                </div>
                <div className="dashboard-controls">
                  <button onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
                </div>
              </header>
              <ReportsView companyId={companyId} />
            </div>
          } />
          <Route path="/invoices" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
                </div>
                <div className="dashboard-controls">
                  <button onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
                </div>
              </header>
              <InvoicesView companyId={companyId} />
            </div>
          } />
          <Route path="/stores" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
                </div>
                <div className="dashboard-controls">
                  <button onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
                </div>
              </header>
              <StoreManagerView companyId={companyId} />
            </div>
          } />
          <Route path="/reps" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
                </div>
                <div className="dashboard-controls">
                  <button onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
                </div>
              </header>
              <RepManager companyId={companyId} currentUser={currentUser} />
            </div>
          } />
        </Routes>
        <MobileNav />
      </div>
    </Router>
  );
}

export default App;
