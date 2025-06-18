import React, { useEffect, useState } from 'react';
import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import './App.css';

function StoreManagerView({ companyId }) {
  const [regions, setRegions] = useState([]);
  const [newRegion, setNewRegion] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [editingRegionId, setEditingRegionId] = useState(null);
  const [editingRegionName, setEditingRegionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteRegionId, setShowDeleteRegionId] = useState(null);
  const [expandedRegions, setExpandedRegions] = useState([]);
  const [toast, setToast] = useState(null);
  const [regionValidation, setRegionValidation] = useState("");
  const [storeValidation, setStoreValidation] = useState("");
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [editingStoreName, setEditingStoreName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [selectedStores, setSelectedStores] = useState([]);
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
      setError(null);
    } catch (err) {
      console.error("Error refreshing regions and stores:", err);
      setError("Failed to refresh data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Export selected stores
  const handleExport = () => {
    const rows = [
      ["Region", "Store"],
      ...selectedStores.map(({ regionId, storeId }) => {
        const region = regions.find(r => r.id === regionId);
        const store = region?.stores.find(s => s.id === storeId);
        return [region?.name || "", store?.name || ""];
      })
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "selected_stores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle region expansion
  const toggleRegion = (regionId) => {
    setExpandedRegions(prev => 
      prev.includes(regionId) 
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };

  // Edit store name
  const handleEditStore = (storeId, currentName) => {
    setEditingStoreId(storeId);
    setEditingStoreName(currentName);
  };

  // Save store name edit
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
    } catch (err) {
      console.error("Error updating store name:", err);
      setError("Failed to update store name. Please try again.");
    }
  };

  // Toggle store selection
  const toggleStoreSelect = (regionId, storeId) => {
    setSelectedStores(prev => {
      const isSelected = prev.some(s => s.regionId === regionId && s.storeId === storeId);
      if (isSelected) {
        return prev.filter(s => !(s.regionId === regionId && s.storeId === storeId));
      } else {
        return [...prev, { regionId, storeId }];
      }
    });
  };

  // Toggle select all stores in a region
  const toggleSelectAllRegion = (regionId, storeIds) => {
    setSelectedStores(prev => {
      const regionStores = prev.filter(s => s.regionId === regionId);
      if (regionStores.length === storeIds.length) {
        return prev.filter(s => s.regionId !== regionId);
      } else {
        const newStores = storeIds.map(storeId => ({ regionId, storeId }));
        return [...prev.filter(s => s.regionId !== regionId), ...newStores];
      }
    });
  };

  // Bulk delete selected stores
  const handleBulkDelete = async () => {
    if (!selectedStores.length) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedStores.length} stores?`);
    if (!confirmed) return;
    try {
      await Promise.all(selectedStores.map(({ regionId, storeId }) => 
        deleteDoc(doc(db, "companies", companyId, "regions", regionId, "stores", storeId))
      ));
      setSelectedStores([]);
      setError(null);
      refreshRegions();
      showToast("success", "Selected stores deleted!");
    } catch (err) {
      console.error("Error deleting stores:", err);
      setError("Failed to delete stores. Please try again.");
      showToast("error", "Failed to delete stores");
    }
  };

  // Add store modal
  const handleAddStoreModal = async (regionId) => {
    if (!modalStoreName.trim()) {
      setModalStoreValidation("Please enter a store name");
      return;
    }
    try {
      await addDoc(collection(db, "companies", companyId, "regions", regionId, "stores"), {
        name: modalStoreName.trim()
      });
      setModalStoreName("");
      setShowAddStoreRegionId(null);
      setError(null);
      showToast("success", "Store added!");
      refreshRegions();
    } catch (err) {
      console.error("Error adding store:", err);
      setError("Failed to add store. Please try again.");
      showToast("error", "Failed to add store");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading regions and stores...</p>
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
    <div className="store-manager-container">
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
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
            {regionValidation && <p className="validation-error">{regionValidation}</p>}
          </div>

          {selectedStores.length > 0 && (
            <div className="bulk-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button
                className="btn btn-danger"
                onClick={handleBulkDelete}
              >
                Delete Selected ({selectedStores.length})
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExport}
              >
                Export Selected
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="regions-list">
        {regions.map(region => (
          <div key={region.id} className="region-card">
            <div className="region-header">
              <div className="region-info">
                <button
                  className="expand-button"
                  onClick={() => toggleRegion(region.id)}
                >
                  {expandedRegions.includes(region.id) ? '▼' : '▶'}
                </button>
                {editingRegionId === region.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editingRegionName}
                      onChange={e => setEditingRegionName(e.target.value)}
                      className="form-control"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSaveRegionName(region.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingRegionId(null);
                        setEditingRegionName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h3>{region.name}</h3>
                )}
              </div>
              
              <div className="region-stats">
                <div className="region-stat">
                  <span>📊</span>
                  <span>{region.stores.length} stores</span>
                </div>
              </div>
              
              <div className="region-actions">
                {editingRegionId !== region.id && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleEditRegion(region.id, region.name)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowDeleteRegionId(region.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {expandedRegions.includes(region.id) && (
              <div className="stores-list">
                <div className="stores-header">
                  <div className="select-all">
                    <input
                      type="checkbox"
                      checked={region.stores.every(store => 
                        selectedStores.some(s => s.regionId === region.id && s.storeId === store.id)
                      )}
                      onChange={() => toggleSelectAllRegion(
                        region.id,
                        region.stores.map(s => s.id)
                      )}
                    />
                    <span>Select All Stores</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddStoreRegionId(region.id)}
                  >
                    Add Store
                  </button>
                </div>

                {region.stores.map(store => (
                  <div key={store.id} className="store-card">
                    <div className="store-info">
                      <div className="store-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedStores.some(s => 
                            s.regionId === region.id && s.storeId === store.id
                          )}
                          onChange={() => toggleStoreSelect(region.id, store.id)}
                        />
                      </div>
                      
                      <div className="store-avatar">
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="store-details">
                        {editingStoreId === store.id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editingStoreName}
                              onChange={e => setEditingStoreName(e.target.value)}
                              className="form-control"
                            />
                            <button
                              className="btn btn-primary"
                              onClick={() => handleSaveStoreName(region.id, store.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditingStoreId(null);
                                setEditingStoreName("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="store-name">{store.name}</div>
                            <div className="store-meta">
                              <span>📍 {region.name}</span>
                              <span className="store-status">Active</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="store-actions">
                      {editingStoreId !== store.id && (
                        <>
                          <button
                            className="store-action-btn edit"
                            onClick={() => handleEditStore(store.id, store.name)}
                            title="Edit Store"
                          >
                            ✏️
                          </button>
                          <button
                            className="store-action-btn delete"
                            onClick={() => handleDeleteStore(region.id, store.id)}
                            title="Delete Store"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showDeleteRegionId && (
        <div className="modal-overlay" onClick={() => setShowDeleteRegionId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Region</h3>
              <button className="modal-close" onClick={() => setShowDeleteRegionId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this region and all its stores? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteRegionId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteRegion(showDeleteRegionId)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showAddStoreRegionId && (
        <div className="modal-overlay" onClick={() => setShowAddStoreRegionId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Store</h3>
              <button className="modal-close" onClick={() => setShowAddStoreRegionId(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="storeName">Store Name</label>
                <input
                  id="storeName"
                  type="text"
                  className="form-control"
                  value={modalStoreName}
                  onChange={e => setModalStoreName(e.target.value)}
                  placeholder="Enter store name"
                />
                {modalStoreValidation && (
                  <p className="validation-error">{modalStoreValidation}</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddStoreRegionId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleAddStoreModal(showAddStoreRegionId)}>Add</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}

export default StoreManagerView;