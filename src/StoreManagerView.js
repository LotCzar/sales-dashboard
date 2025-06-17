import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import './App.css';

function StoreManagerView({ companyId }) {
  const [regions, setRegions] = useState([]); // [{id, name, stores: [{id, name}]}]
  const [newRegion, setNewRegion] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [editingRegionId, setEditingRegionId] = useState(null);
  const [editingRegionName, setEditingRegionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteRegionId, setShowDeleteRegionId] = useState(null);
  const [expandedRegions, setExpandedRegions] = useState([]); // region ids
  const [toast, setToast] = useState(null); // {type, message}
  const [regionValidation, setRegionValidation] = useState("");
  const [storeValidation, setStoreValidation] = useState("");
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [editingStoreName, setEditingStoreName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [selectedStores, setSelectedStores] = useState([]); // [{regionId, storeId}]
  const [showAddStoreRegionId, setShowAddStoreRegionId] = useState(null);
  const [modalStoreName, setModalStoreName] = useState("");
  const [modalStoreValidation, setModalStoreValidation] = useState("");

  // Toast helper
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all regions and their stores
  useEffect(() => {
    if (!companyId) return;
    const fetchRegionsAndStores = async () => {
      setLoading(true);
      try {
        const regionsSnapshot = await getDocs(collection(db, "companies", companyId, "regions"));
        const regionsData = await Promise.all(regionsSnapshot.docs.map(async (regionDoc) => {
          const regionId = regionDoc.id;
          const regionName = regionDoc.data().name || regionId;
          const storesSnapshot = await getDocs(collection(db, "companies", companyId, "regions", regionId, "stores"));
          const stores = storesSnapshot.docs.map(storeDoc => ({ id: storeDoc.id, ...storeDoc.data() }));
          return { id: regionId, name: regionName, stores };
        }));
        setRegions(regionsData);
        setError(null);
      } catch (err) {
        console.error("Error loading regions and stores:", err);
        setError("Failed to load regions and stores. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchRegionsAndStores();
  }, [companyId]);

  // Inline validation for region name
  useEffect(() => {
    if (!newRegion.trim()) {
      setRegionValidation("");
      return;
    }
    if (regions.some(r => r.name.toLowerCase() === newRegion.trim().toLowerCase())) {
      setRegionValidation("Region name already exists");
    } else {
      setRegionValidation("");
    }
  }, [newRegion, regions]);

  // Inline validation for store name
  useEffect(() => {
    if (!newStoreName.trim() || !selectedRegionId) {
      setStoreValidation("");
      return;
    }
    const region = regions.find(r => r.id === selectedRegionId);
    if (region && region.stores.some(s => s.name.toLowerCase() === newStoreName.trim().toLowerCase())) {
      setStoreValidation("Store name already exists in this region");
    } else {
      setStoreValidation("");
    }
  }, [newStoreName, selectedRegionId, regions]);

  // Add a new region
  const handleAddRegion = async () => {
    if (!newRegion.trim()) {
      setError("Please enter a region name");
      return;
    }
    if (regionValidation) {
      setError(regionValidation);
      return;
    }
    try {
      await addDoc(collection(db, "companies", companyId, "regions"), {
        name: newRegion.trim()
      });
      setNewRegion("");
      setError(null);
      showToast("success", "Region added!");
      refreshRegions();
    } catch (err) {
      console.error("Error adding region:", err);
      setError("Failed to add region. Please try again.");
      showToast("error", "Failed to add region");
    }
  };

  // Edit region name
  const handleEditRegion = (regionId, currentName) => {
    setEditingRegionId(regionId);
    setEditingRegionName(currentName);
  };

  const handleSaveRegionName = async (regionId) => {
    if (!editingRegionName.trim()) {
      setError("Region name cannot be empty");
      return;
    }
    try {
      await updateDoc(doc(db, "companies", companyId, "regions", regionId), {
        name: editingRegionName.trim()
      });
      setEditingRegionId(null);
      setEditingRegionName("");
      setError(null);
      refreshRegions();
    } catch (err) {
      console.error("Error updating region name:", err);
      setError("Failed to update region name. Please try again.");
    }
  };

  // Delete a region and all its stores
  const handleDeleteRegion = async (regionId) => {
    try {
      // Delete all stores in the region
      const storesSnapshot = await getDocs(collection(db, "companies", companyId, "regions", regionId, "stores"));
      await Promise.all(storesSnapshot.docs.map(storeDoc => deleteDoc(storeDoc.ref)));
      // Delete the region document
      await deleteDoc(doc(db, "companies", companyId, "regions", regionId));
      setShowDeleteRegionId(null);
      setError(null);
      refreshRegions();
    } catch (err) {
      console.error("Error deleting region:", err);
      setError("Failed to delete region. Please try again.");
    }
  };

  // Add a new store to a region
  const handleAddStore = async () => {
    if (!newStoreName.trim() || !selectedRegionId) {
      setError("Please select a region and enter a store name");
      return;
    }
    if (storeValidation) {
      setError(storeValidation);
      return;
    }
    try {
      await addDoc(collection(db, "companies", companyId, "regions", selectedRegionId, "stores"), {
        name: newStoreName.trim()
      });
      setNewStoreName("");
      setSelectedRegionId("");
      setError(null);
      showToast("success", "Store added!");
      refreshRegions();
    } catch (err) {
      console.error("Error adding store:", err);
      setError("Failed to add store. Please try again.");
      showToast("error", "Failed to add store");
    }
  };

  // Delete a store from a region
  const handleDeleteStore = async (regionId, storeId) => {
    const confirmed = window.confirm("Are you sure you want to remove this store?");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "companies", companyId, "regions", regionId, "stores", storeId));
      setError(null);
      refreshRegions();
    } catch (err) {
      console.error("Error deleting store:", err);
      setError("Failed to delete store. Please try again.");
    }
  };

  // Refresh regions and stores
  const refreshRegions = async () => {
    setLoading(true);
    try {
      const regionsSnapshot = await getDocs(collection(db, "companies", companyId, "regions"));
      const regionsData = await Promise.all(regionsSnapshot.docs.map(async (regionDoc) => {
        const regionId = regionDoc.id;
        const regionName = regionDoc.data().name || regionId;
        const storesSnapshot = await getDocs(collection(db, "companies", companyId, "regions", regionId, "stores"));
        const stores = storesSnapshot.docs.map(storeDoc => ({ id: storeDoc.id, ...storeDoc.data() }));
        return { id: regionId, name: regionName, stores };
      }));
      setRegions(regionsData);
    } catch (err) {
      setError("Failed to refresh regions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = ["Store,Region"];
    regions.forEach(region => {
      region.stores.forEach(store => {
        rows.push(`${store.name},${region.name}`);
      });
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `store_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle region expand/collapse
  const toggleRegion = (regionId) => {
    setExpandedRegions((prev) =>
      prev.includes(regionId)
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };

  // Inline edit store name
  const handleEditStore = (storeId, currentName) => {
    setEditingStoreId(storeId);
    setEditingStoreName(currentName);
  };
  const handleSaveStoreName = async (regionId, storeId) => {
    if (!editingStoreName.trim()) {
      setError("Store name cannot be empty");
      return;
    }
    try {
      await updateDoc(doc(db, "companies", companyId, "regions", regionId, "stores", storeId), {
        name: editingStoreName.trim()
      });
      setEditingStoreId(null);
      setEditingStoreName("");
      setError(null);
      refreshRegions();
      showToast("success", "Store name updated!");
    } catch (err) {
      setError("Failed to update store name. Please try again.");
      showToast("error", "Failed to update store name");
    }
  };

  // Filtered regions and stores
  const filteredRegions = regions
    .filter(region => !regionFilter || region.id === regionFilter)
    .map(region => ({
      ...region,
      stores: region.stores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(region => region.stores.length > 0);

  // Select/deselect store
  const toggleStoreSelect = (regionId, storeId) => {
    const key = `${regionId}|${storeId}`;
    setSelectedStores(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };
  // Select/deselect all in region
  const toggleSelectAllRegion = (regionId, storeIds) => {
    const regionKeys = storeIds.map(storeId => `${regionId}|${storeId}`);
    const allSelected = regionKeys.every(key => selectedStores.includes(key));
    setSelectedStores(prev =>
      allSelected
        ? prev.filter(key => !regionKeys.includes(key))
        : [...prev, ...regionKeys.filter(key => !prev.includes(key))]
    );
  };
  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedStores.length === 0) return;
    if (!window.confirm("Delete selected stores?")) return;
    try {
      await Promise.all(selectedStores.map(async key => {
        const [regionId, storeId] = key.split("|");
        await deleteDoc(doc(db, "companies", companyId, "regions", regionId, "stores", storeId));
      }));
      setSelectedStores([]);
      refreshRegions();
      showToast("success", "Selected stores deleted!");
    } catch (err) {
      showToast("error", "Failed to delete selected stores");
    }
  };
  // Bulk export
  const handleBulkExport = () => {
    if (selectedStores.length === 0) return;
    const rows = ["Store,Region"];
    selectedStores.forEach(key => {
      const [regionId, storeId] = key.split("|");
      const region = regions.find(r => r.id === regionId);
      const store = region?.stores.find(s => s.id === storeId);
      if (region && store) rows.push(`${store.name},${region.name}`);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `selected_stores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add store via modal
  const handleAddStoreModal = async (regionId) => {
    if (!modalStoreName.trim()) {
      setModalStoreValidation("Please enter a store name");
      return;
    }
    const region = regions.find(r => r.id === regionId);
    if (region && region.stores.some(s => s.name.toLowerCase() === modalStoreName.trim().toLowerCase())) {
      setModalStoreValidation("Store name already exists in this region");
      return;
    }
    try {
      await addDoc(collection(db, "companies", companyId, "regions", regionId, "stores"), {
        name: modalStoreName.trim()
      });
      setModalStoreName("");
      setModalStoreValidation("");
      setShowAddStoreRegionId(null);
      showToast("success", "Store added!");
      refreshRegions();
    } catch (err) {
      setModalStoreValidation("Failed to add store. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading regions and stores...</p>
        </div>
      </div>
    );
  }

  const totalStores = regions.reduce((sum, region) => sum + region.stores.length, 0);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Store Manager</h1>
        <div className="dashboard-controls">
          <button className="btn btn-primary" onClick={handleExport}>
            Export Store List
          </button>
        </div>
      </div>

      <div className="dashboard-summary" style={{marginBottom: '2rem'}}>
        <div className="summary-card">
          <h3>Total Stores</h3>
          <div className="value">{totalStores}</div>
        </div>
        <div className="summary-card">
          <h3>Regions</h3>
          <div className="value">{regions.length}</div>
        </div>
      </div>

      <div className="store-filters-panel">
        <input
          className="form-control"
          style={{maxWidth: 260}}
          placeholder="Search stores..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          className="form-control"
          style={{maxWidth: 200}}
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
        >
          <option value="">All Regions</option>
          {regions.map(region => (
            <option key={region.id} value={region.id}>{region.name}</option>
          ))}
        </select>
      </div>

      <div className="add-store-form">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
            <label htmlFor="regionName">Add Region</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="regionName"
                name="regionName"
                type="text"
                className="form-control"
                placeholder="Enter region name"
                value={newRegion}
                onChange={e => setNewRegion(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={handleAddRegion}>Add</button>
            </div>
            {regionValidation && <div className="validation-message">{regionValidation}</div>}
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: '1.5rem' }}>
            <button 
              className="btn btn-danger" 
              disabled={selectedStores.length === 0} 
              onClick={handleBulkDelete}
            >
              Delete Selected {selectedStores.length > 0 && `(${selectedStores.length})`}
            </button>
            <button 
              className="btn btn-secondary" 
              disabled={selectedStores.length === 0} 
              onClick={handleBulkExport}
            >
              Export Selected
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {totalStores === 0 ? (
        <div className="empty-state">
          <p>No stores added yet. Add your first region and store using the form above.</p>
        </div>
      ) : (
        <div className="store-list">
          {filteredRegions.map(region => (
            <div key={region.id} className={`region-card modern-card${expandedRegions.includes(region.id) ? ' expanded' : ''}`} style={{position: 'relative'}}>
              <button
                className="icon-btn region-expand-btn"
                onClick={() => toggleRegion(region.id)}
                title={expandedRegions.includes(region.id) ? 'Collapse' : 'Expand'}
                aria-label={expandedRegions.includes(region.id) ? 'Collapse region' : 'Expand region'}
              >
                {expandedRegions.includes(region.id) ? '▼' : '▶'}
              </button>
              <div className="region-header-row">
                <div className="region-header-title-centered">{editingRegionId === region.id ? (
                  <div className="region-title-edit-group">
                    <input
                      className="form-control"
                      value={editingRegionName}
                      onChange={e => setEditingRegionName(e.target.value)}
                      style={{ marginRight: '0.5rem', maxWidth: 180 }}
                    />
                    <button className="btn btn-primary" onClick={() => handleSaveRegionName(region.id)} style={{ marginRight: '0.5rem' }}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingRegionId(null)}>Cancel</button>
                  </div>
                ) : (
                  region.name
                )}</div>
                <div className="region-header-actions">
                  <button className="btn btn-secondary add-store-btn" onClick={() => { setShowAddStoreRegionId(region.id); setModalStoreName(""); setModalStoreValidation(""); }} title="Add Store" aria-label="Add Store">Add Store</button>
                  <button className="icon-btn" title="Edit Region" aria-label="Edit Region" onClick={() => handleEditRegion(region.id, region.name)}>
                    ✏️
                  </button>
                  <button className="icon-btn" title="Delete Region" aria-label="Delete Region" onClick={() => setShowDeleteRegionId(region.id)}>
                    🗑️
                  </button>
                  <input
                    type="checkbox"
                    checked={region.stores.length > 0 && region.stores.every(store => selectedStores.includes(`${region.id}|${store.id}`))}
                    onChange={() => toggleSelectAllRegion(region.id, region.stores.map(s => s.id))}
                    disabled={region.stores.length === 0}
                    title="Select all stores in region"
                    style={{marginLeft: 12}}
                  />
                </div>
              </div>
              {showDeleteRegionId === region.id && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Delete Region</h3>
                    </div>
                    <p>Are you sure you want to delete the region "{region.name}" and all its stores?</p>
                    <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowDeleteRegionId(null)}>Cancel</button>
                      <button className="btn btn-danger" onClick={() => handleDeleteRegion(region.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
              {expandedRegions.includes(region.id) && (
                <div className={`region-stores expanded`} style={{maxHeight: 1000, overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)'}}>
                  {region.stores.length === 0 ? (
                    <div className="empty-message">No stores in this region.</div>
                  ) : (
                    region.stores.map(store => (
                      <div key={store.id} className="store-item modern-store-card store-row">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(`${region.id}|${store.id}`)}
                          onChange={() => toggleStoreSelect(region.id, store.id)}
                          style={{marginRight: 12}}
                          title={`Select ${store.name}`}
                        />
                        <div className="store-avatar">{store.name ? store.name[0].toUpperCase() : "S"}</div>
                        <div className="store-details">
                          {editingStoreId === store.id ? (
                            <>
                              <input
                                className="form-control"
                                value={editingStoreName}
                                onChange={e => setEditingStoreName(e.target.value)}
                                style={{ marginRight: '0.5rem', maxWidth: 180 }}
                              />
                              <button className="btn btn-primary" onClick={() => handleSaveStoreName(region.id, store.id)} style={{ marginRight: '0.5rem' }}>Save</button>
                              <button className="btn btn-secondary" onClick={() => setEditingStoreId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="store-name">{store.name}</span>
                              <span className="store-region">{region.name}</span>
                            </>
                          )}
                        </div>
                        <div className="store-actions">
                          {editingStoreId !== store.id && (
                            <>
                              <button className="icon-btn" title="Edit Store" aria-label="Edit Store" onClick={() => handleEditStore(store.id, store.name)}>
                                ✏️
                              </button>
                              <button className="icon-btn" title="Delete Store" aria-label="Delete Store" onClick={() => handleDeleteStore(region.id, store.id)}>
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="region-divider"></div>
              {showAddStoreRegionId === region.id && (
                <div className="modal-overlay">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Add Store to {region.name}</h3>
                    </div>
                    <div className="modal-body">
                      <input
                        className="form-control"
                        placeholder="Store name"
                        value={modalStoreName}
                        onChange={e => setModalStoreName(e.target.value)}
                        autoFocus
                      />
                      {modalStoreValidation && <div className="validation-message" style={{marginTop: 8}}>{modalStoreValidation}</div>}
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-secondary" onClick={() => setShowAddStoreRegionId(null)}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => handleAddStoreModal(region.id)}>Add Store</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && (
        <div className={`toast-snackbar ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}

export default StoreManagerView;