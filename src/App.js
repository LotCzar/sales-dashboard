import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import './App.css';
import Login from './Login.js';
import InvoicesView from './PaymentsView.js';
import StoreManagerView from './StoreManagerView.js';
import Register from './Register.js';
import RepManager from './RepManager.js';
import ReportsView from './ReportsView.js';
import HomeView from './AnalyticsView.js';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import MobileNav from './components/MobileNav.js';

function App() {
  const [reports, setReports] = useState([]);
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "");
  const [regionStoreMap, setRegionStoreMap] = useState({});
  const [showRegister, setShowRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const companyId = localStorage.getItem('companyId');

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
          <div className="desktop-nav-spacer" style={{ flex: 1 }}></div>
          <button className="logout-btn" onClick={() => { localStorage.removeItem("companyName"); setCompanyName(""); }}>Log Out</button>
        </nav>
        <Routes>
          <Route path="/" element={
            <div className="dashboard-container">
              <header className="dashboard-header">
                <div className="dashboard-title">
                  <h1>{companyName} Dashboard</h1>
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
