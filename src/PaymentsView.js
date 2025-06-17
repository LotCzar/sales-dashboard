import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import './App.css';

const InvoicesView = ({ companyId }) => {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [storeFilter, setStoreFilter] = useState([]);
  const [repFilter, setRepFilter] = useState([]);
  const [repMap, setRepMap] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch invoices
        const invoiceSnapshot = await getDocs(collection(db, "companies", companyId, "reports"));
        const invoiceData = invoiceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch payments
        const paymentSnapshot = await getDocs(collection(db, "companies", companyId, "payments"));
        const paymentData = paymentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Process invoices with payment data
        const processedInvoices = invoiceData.map(invoice => {
          const invoicePayments = paymentData.filter(p => p.invoiceId === invoice.id);
          const paymentsDates = invoicePayments
            .map(p => p.paidAt?.seconds || p.date?.seconds || 0)
            .filter(Boolean);
          // Add initial payment date if present
          if (invoice.initialPayment && (invoice.initialPayment.date?.seconds || invoice.initialPayment.createdAt?.seconds)) {
            paymentsDates.push(invoice.initialPayment.date?.seconds || invoice.initialPayment.createdAt?.seconds);
          }
          const lastPaymentDate = paymentsDates.length > 0 ? Math.max(...paymentsDates) : null;
          const paymentsSum = invoicePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          const initialPaid = invoice.initialPayment && invoice.initialPayment.amount ? parseFloat(invoice.initialPayment.amount) : 0;
          const totalPaid = paymentsSum + initialPaid;
          const totalAmount = parseFloat(invoice.amount) || 0;
          const remainingBalance = totalAmount - totalPaid;
          
          // Determine status considering both initial payment and subsequent payments
          let status;
          if (remainingBalance <= 0) {
            status = 'Paid';
          } else if (totalPaid === 0) {
            status = 'Unpaid';
          } else {
            status = 'Partially Paid';
          }
          
          return {
            ...invoice,
            payments: invoicePayments,
            totalPaid,
            remainingBalance,
            status,
            lastPaymentDate,
          };
        });

        setInvoices(processedInvoices);
        setPayments(paymentData);

        const repUids = [...new Set(processedInvoices.map(i => i.createdBy).filter(Boolean))];
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
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Filter invoices based on search and filters
  const filteredInvoices = invoices.filter(invoice => {
    const searchText = search.toLowerCase();
    const matchesSearch = !searchText || 
      Object.values(invoice).some(val => 
        typeof val === 'string' && val.toLowerCase().includes(searchText)
      ) ||
      invoice.invoiceNumber?.toString().includes(searchText);

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(invoice.status);
    const matchesStore = storeFilter.length === 0 || storeFilter.includes(invoice.store);
    const matchesRep = repFilter.length === 0 || repFilter.includes(invoice.createdBy);
    
    const invoiceDate = new Date(invoice.date?.seconds * 1000 || 0);
    const matchesDate = (!dateFrom || invoiceDate >= new Date(dateFrom)) && 
                       (!dateTo || invoiceDate <= new Date(dateTo));

    return matchesSearch && matchesStatus && matchesStore && matchesRep && matchesDate;
  });

  // Calculate summary statistics
  const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, i) => sum + i.totalPaid, 0);
  const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + i.remainingBalance, 0);
  const overdueInvoices = filteredInvoices.filter(i => 
    i.remainingBalance > 0 && i.date?.seconds && 
    new Date(i.date.seconds * 1000) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  // Get unique values for filters
  const allStatuses = [...new Set(invoices.map(i => i.status))];
  const allStores = [...new Set(invoices.map(i => i.store))].filter(Boolean);
  const allReps = [...new Set(invoices.map(i => i.createdBy))].filter(Boolean);

  const handleExport = () => {
    const rows = [
      ["Invoice #", "Store", "Amount", "Paid", "Balance", "Status", "Created By", "Date", "Last Payment"],
      ...filteredInvoices.map(i => [
        i.invoiceNumber || "",
        i.store || "",
        parseFloat(i.amount || 0).toFixed(2),
        i.totalPaid.toFixed(2),
        i.remainingBalance.toFixed(2),
        i.status,
        repMap[i.createdBy] || i.createdBy || "",
        i.date?.seconds ? new Date(i.date.seconds * 1000).toLocaleString() : "",
        i.lastPaymentDate ? new Date(i.lastPaymentDate * 1000).toLocaleString() : ""
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "invoices_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading invoices and payments data...</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div className="reports-container">
      <section className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Invoiced</h3>
          <p>${totalInvoiced.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Total Paid</h3>
          <p>${totalPaid.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Outstanding</h3>
          <p>${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Overdue Invoices</h3>
          <p>{overdueInvoices.length}</p>
        </div>
      </section>

      <section className="filters-panel">
        <div className="search-container">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search invoices by any field..."
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
              Status
              {statusFilter.length > 0 && (
                <span className="filter-count">{statusFilter.length}</span>
              )}
            </label>
            <select
              className="filter-select"
              multiple
              value={statusFilter}
              onChange={e => setStatusFilter(Array.from(e.target.selectedOptions, o => o.value))}
            >
              {allStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
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

          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <div className="date-range-inputs">
              <div className="date-input-group">
                <input
                  type="date"
                  className="date-input"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  placeholder="From"
                />
              </div>
              <div className="date-input-group">
                <input
                  type="date"
                  className="date-input"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button 
            className="btn-clear"
            onClick={() => {
              setSearch("");
              setStatusFilter([]);
              setStoreFilter([]);
              setRepFilter([]);
              setDateFrom("");
              setDateTo("");
            }}
            disabled={!search && statusFilter.length === 0 && storeFilter.length === 0 && repFilter.length === 0 && !dateFrom && !dateTo}
          >
            Clear Filters
          </button>
          <button className="btn-apply" onClick={handleExport}>
            Export Results
          </button>
        </div>
      </section>

      {filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <p>No invoices found matching your criteria</p>
          <button 
            className="clear-filters-button"
            onClick={() => {
              setSearch("");
              setStatusFilter([]);
              setStoreFilter([]);
              setRepFilter([]);
              setDateFrom("");
              setDateTo("");
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
                  <th>Invoice #</th>
                  <th>Store</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Last Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="table-row">
                    <td>{invoice.invoiceNumber || '—'}</td>
                    <td>{invoice.store || '—'}</td>
                    <td>${Number(invoice.amount || 0).toLocaleString()}</td>
                    <td>${Number(invoice.totalPaid || 0).toLocaleString()}</td>
                    <td>${Number(invoice.remainingBalance || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${invoice.status.toLowerCase().replace(' ', '-')}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>{repMap[invoice.createdBy] || invoice.createdBy || '—'}</td>
                    <td>{invoice.date?.seconds ? new Date(invoice.date.seconds * 1000).toLocaleString() : '—'}</td>
                    <td>{invoice.lastPaymentDate ? new Date(invoice.lastPaymentDate * 1000).toLocaleString() : '—'}</td>
                    <td>
                      <button 
                        className="view-details-button"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <i className="fas fa-eye"></i>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="export-container">
            <button className="export-button" onClick={handleExport}>
              <i className="fas fa-download"></i>
              Export Invoices
            </button>
          </div>

          {selectedInvoice && (
            <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
              <div className="modal-content invoice-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header invoice-modal-header">
                  <div className="modal-title-group">
                    <h3>Invoice #{selectedInvoice.invoiceNumber || '—'}</h3>
                    <span className={`status-badge status-${selectedInvoice.status.toLowerCase().replace(' ', '-')}`}>{selectedInvoice.status}</span>
                  </div>
                  <button className="modal-close enhanced-close" onClick={() => setSelectedInvoice(null)} aria-label="Close">×</button>
                </div>
                <div className="modal-body invoice-modal-body">
                  <div className="invoice-detail-grid">
                    <div className="invoice-detail-card">
                      <div className="detail-row"><span className="detail-label">Store:</span><span className="detail-value">{selectedInvoice.store || '—'}</span></div>
                      <div className="detail-row"><span className="detail-label">Amount:</span><span className="detail-value">${parseFloat(selectedInvoice.amount || 0).toLocaleString()}</span></div>
                      <div className="detail-row"><span className="detail-label">Status:</span><span className={`status-badge status-${selectedInvoice.status.toLowerCase().replace(' ', '-')}`}>{selectedInvoice.status}</span></div>
                      <div className="detail-row"><span className="detail-label">Sales Rep:</span><span className="detail-value">{repMap[selectedInvoice.createdBy] || selectedInvoice.createdBy || '—'}</span></div>
                      <div className="detail-row"><span className="detail-label">Date:</span><span className="detail-value">{selectedInvoice.date?.seconds ? new Date(selectedInvoice.date.seconds * 1000).toLocaleString() : '—'}</span></div>
                      <div className="detail-row"><span className="detail-label">Outstanding:</span><span className="detail-value">${selectedInvoice.remainingBalance.toLocaleString()}</span></div>
                    </div>
                    <div className="invoice-image-card">
                      {selectedInvoice.invoiceImageURL ? (
                        <a href={selectedInvoice.invoiceImageURL} target="_blank" rel="noopener noreferrer">
                          <img src={selectedInvoice.invoiceImageURL} alt="Invoice" className="invoice-preview-large" />
                        </a>
                      ) : (
                        <div className="no-invoice-image">No Invoice Image</div>
                      )}
                    </div>
                  </div>
                  <div className="payment-history enhanced-payment-history">
                    <h4>Payment History</h4>
                    {(() => {
                      const initial = selectedInvoice.initialPayment && selectedInvoice.initialPayment.amount !== undefined
                        ? [{
                            ...selectedInvoice.initialPayment,
                            isInitial: true,
                            id: 'initial',
                          }]
                        : [];
                      const allPayments = [...initial, ...(selectedInvoice.payments || [])];
                      const totalPaid = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                      return allPayments.length > 0 ? (
                        <div className="payment-table-wrapper">
                          <table className="payment-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Paid By</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allPayments.map(payment => (
                                <tr key={payment.id || payment.createdAt || Math.random()} className={payment.isInitial ? 'initial-payment-row' : ''}>
                                  <td>{payment.date ? new Date(payment.date.seconds ? payment.date.seconds * 1000 : payment.date).toLocaleString() : payment.createdAt ? new Date(payment.createdAt.seconds ? payment.createdAt.seconds * 1000 : payment.createdAt).toLocaleString() : '—'}</td>
                                  <td>${parseFloat(payment.amount || 0).toLocaleString()}</td>
                                  <td>{payment.method === 'Cash' ? '💵 Cash' : payment.method === 'Card' ? '💳 Card' : payment.method || '—'}</td>
                                  <td>{repMap[payment.createdBy] || payment.createdBy || '—'}</td>
                                  <td>{payment.notes || (payment.isInitial ? 'Initial Payment' : '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="summary-row">
                                <td colSpan={1}><b>Total Paid</b></td>
                                <td colSpan={4}>${totalPaid.toLocaleString()}</td>
                              </tr>
                              <tr className="summary-row">
                                <td colSpan={1}><b>Outstanding</b></td>
                                <td colSpan={4}>${selectedInvoice.remainingBalance.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <p className="no-payments">No payments recorded for this invoice.</p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvoicesView;
