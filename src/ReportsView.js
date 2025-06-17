import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './App.css';

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'region', label: 'Region' },
  { key: 'store', label: 'Store' },
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'amount', label: 'Amount' },
  { key: 'orderDropped', label: 'Order Dropped' },
  { key: 'samplesDropped', label: 'Samples Dropped' },
  { key: 'samples', label: 'Samples' },
  { key: 'notes', label: 'Notes' },
  { key: 'invoiceImageURL', label: 'Invoice Image' },
  { key: 'initialPaymentAmount', label: 'Initial Payment Amount' },
  { key: 'createdBy', label: 'Sales Rep' },
  { key: 'updatedAt', label: 'Updated At' },
];

const ReportsView = ({ companyId }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState([]);
  const [storeFilter, setStoreFilter] = useState([]);
  const [repFilter, setRepFilter] = useState([]);
  const [repMap, setRepMap] = useState({});

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const reportSnapshot = await getDocs(collection(db, "companies", companyId, "reports"));
        const allReports = reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReports(allReports);
        // Fetch rep names
        const repUids = [...new Set(allReports.map(r => r.createdBy).filter(Boolean))];
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
        setError("Failed to load reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Unique values for filters
  const allRegions = [...new Set(reports.map(r => r.region).filter(Boolean))];
  const allStores = [...new Set(reports.map(r => r.store).filter(Boolean))];
  const allReps = [...new Set(reports.map(r => r.createdBy).filter(Boolean))];

  // Filtering and search logic
  const filteredReports = reports.filter(r => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      !searchText ||
      Object.values(r).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(searchText)
      ) ||
      (Array.isArray(r.samples) && r.samples.join(", ").toLowerCase().includes(searchText));
    const matchesRegion = regionFilter.length === 0 || regionFilter.includes(r.region);
    const matchesStore = storeFilter.length === 0 || storeFilter.includes(r.store);
    const matchesRep = repFilter.length === 0 || repFilter.includes(r.createdBy);
    return matchesSearch && matchesRegion && matchesStore && matchesRep;
  });

  // Sorting logic
  const sortedReports = [...filteredReports].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === 'date' || sortBy === 'updatedAt') {
      aVal = aVal?.seconds ? aVal.seconds : aVal;
      bVal = bVal?.seconds ? bVal.seconds : bVal;
    }
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const handleExportReports = () => {
    const headers = columns.map(col => col.label);
    const rows = sortedReports.map(report => [
      report.date ? new Date(report.date.seconds ? report.date.seconds * 1000 : report.date).toLocaleString() : '',
      report.region || '',
      report.store || '',
      report.invoiceNumber || '',
      report.amount !== undefined ? report.amount : '',
      report.orderDropped ? "Yes" : "No",
      report.samplesDropped ? "Yes" : "No",
      Array.isArray(report.samples) ? report.samples.join(", ") : '',
      report.notes || '',
      report.invoiceImageURL ? report.invoiceImageURL : '',
      report.initialPayment && report.initialPayment.amount !== undefined ? report.initialPayment.amount : '',
      repMap[report.createdBy] || report.createdBy || '',
      report.updatedAt ? new Date(report.updatedAt.seconds ? report.updatedAt.seconds * 1000 : report.updatedAt).toLocaleString() : ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `filtered_reports.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-container">
      <section className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Reports</h3>
          <p>{sortedReports.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Sales</h3>
          <p>${sortedReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Unique Stores</h3>
          <p>{[...new Set(sortedReports.map(r => r.store))].length}</p>
        </div>
      </section>

      <section className="filters-panel">
        <div className="search-container">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search reports by any field..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">
              Region
              {regionFilter.length > 0 && (
                <span className="filter-count">{regionFilter.length}</span>
              )}
            </label>
            <select
              className="filter-select"
              multiple
              value={regionFilter}
              onChange={e => setRegionFilter(Array.from(e.target.selectedOptions, o => o.value))}
            >
              {allRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Store
              {storeFilter.length > 0 && (
                <span className="filter-count">{storeFilter.length}</span>
              )}
            </label>
            <select
              className="filter-select"
              multiple
              value={storeFilter}
              onChange={e => setStoreFilter(Array.from(e.target.selectedOptions, o => o.value))}
            >
              {allStores.map(store => (
                <option key={store} value={store}>{store}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Sales Rep
              {repFilter.length > 0 && (
                <span className="filter-count">{repFilter.length}</span>
              )}
            </label>
            <select
              className="filter-select"
              multiple
              value={repFilter}
              onChange={e => setRepFilter(Array.from(e.target.selectedOptions, o => o.value))}
            >
              {allReps.map(rep => (
                <option key={rep} value={rep}>{repMap[rep] || rep}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button 
            className="btn-clear"
            onClick={() => {
              setSearch("");
              setRegionFilter([]);
              setStoreFilter([]);
              setRepFilter([]);
            }}
            disabled={!search && regionFilter.length === 0 && storeFilter.length === 0 && repFilter.length === 0}
          >
            Clear Filters
          </button>
          <button className="btn-apply" onClick={handleExportReports}>
            Export Results
          </button>
        </div>
      </section>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading reports data...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
          </div>
          <button className="retry-button" onClick={() => window.location.reload()}>
            <i className="fas fa-redo"></i>
            Retry
          </button>
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <p>No reports found matching your criteria</p>
          <button 
            className="clear-filters-button"
            onClick={() => {
              setSearch("");
              setRegionFilter([]);
              setStoreFilter([]);
              setRepFilter([]);
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="table-header"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="header-content">
                        <span>{col.label === 'Created By' ? 'Sales Rep' : col.label}</span>
                        {sortBy === col.key && (
                          <span className="sort-indicator">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedReports.map((report) => (
                  <tr key={report.id} className="table-row">
                    <td>{report.date ? new Date(report.date.seconds ? report.date.seconds * 1000 : report.date).toLocaleString() : '—'}</td>
                    <td>{report.region || '—'}</td>
                    <td>{report.store || '—'}</td>
                    <td>{report.invoiceNumber || '—'}</td>
                    <td>${report.amount !== undefined ? parseFloat(report.amount).toLocaleString() : '—'}</td>
                    <td>{report.orderDropped ? "✅" : "—"}</td>
                    <td>{report.samplesDropped ? "✅" : "—"}</td>
                    <td>{Array.isArray(report.samples) ? report.samples.join(", ") : '—'}</td>
                    <td>{report.notes || '—'}</td>
                    <td>
                      {report.invoiceImageURL ? (
                        <a 
                          href={report.invoiceImageURL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-link"
                        >
                          <i className="fas fa-external-link-alt"></i>
                          View
                        </a>
                      ) : '—'}
                    </td>
                    <td>${report.initialPayment && report.initialPayment.amount !== undefined ? parseFloat(report.initialPayment.amount).toLocaleString() : '—'}</td>
                    <td>{repMap[report.createdBy] || report.createdBy || '—'}</td>
                    <td>{report.updatedAt ? new Date(report.updatedAt.seconds ? report.updatedAt.seconds * 1000 : report.updatedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsView; 