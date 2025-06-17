import React, { useState, useEffect } from 'react';
import { db } from './firebase.js';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

function getInitials(name, email) {
  if (name) {
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast toast-${type}`}>{message}<button onClick={onClose}>×</button></div>
  );
}

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function RepManager({ companyId, currentUser }) {
  const [reps, setReps] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleEdit, setRoleEdit] = useState({});
  const [modal, setModal] = useState({ open: false });
  const [toast, setToast] = useState({ message: "", type: "" });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    // Fetch reps (allowedUsers)
    const fetchReps = async () => {
      try {
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);
        if (!companySnap.exists()) {
          setReps([]);
          return;
        }
        const allowedUsers = companySnap.data().allowedUsers || [];
        // Fetch user profiles
        const userProfiles = await Promise.all(
          allowedUsers.map(async (uid) => {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              return {
                uid,
                name: data.name || '',
                email: data.email || '',
                role: data.role || 'rep',
              };
            } else {
              return { uid, name: '', email: '', role: 'rep' };
            }
          })
        );
        setReps(userProfiles);
      } catch (err) {
        setReps([]);
      }
    };

    // Fetch join requests
    const fetchJoinRequests = async () => {
      try {
        const joinRequestsRef = collection(db, 'joinRequests');
        const q = query(
          joinRequestsRef,
          where('companyId', '==', companyId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setJoinRequests(requests);
      } catch (err) {
        setJoinRequests([]);
      }
    };

    await Promise.all([fetchReps(), fetchJoinRequests()]);
    setLoading(false);
  };

  useEffect(() => {
    if (!companyId) return;
    fetchData();
    // eslint-disable-next-line
  }, [companyId]);

  // Inline role change
  const handleRoleChange = async (uid, newRole) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role: newRole });
      setToast({ message: 'Role updated', type: 'success' });
      fetchData();
    } catch {
      setToast({ message: 'Failed to update role', type: 'error' });
    }
  };

  // Remove rep with modal
  const confirmRemove = (userId, name) => {
    setModal({
      open: true,
      title: 'Remove Rep',
      message: `Are you sure you want to remove ${name || 'this rep'}?`,
      onConfirm: async () => {
        setModal({ open: false });
        try {
          const companyRef = doc(db, 'companies', companyId);
          await updateDoc(companyRef, { allowedUsers: arrayRemove(userId) });
          setToast({ message: 'Rep removed', type: 'success' });
          fetchData();
        } catch {
          setToast({ message: 'Failed to remove rep', type: 'error' });
        }
      },
      onCancel: () => setModal({ open: false })
    });
  };

  // Approve join request with modal
  const confirmApprove = (requestId, userName) => {
    setModal({
      open: true,
      title: 'Approve Join Request',
      message: `Approve ${userName || 'this user'} to join?`,
      onConfirm: async () => {
        setModal({ open: false });
        try {
          const reqRef = doc(db, 'joinRequests', requestId);
          const reqSnap = await getDoc(reqRef);
          if (!reqSnap.exists()) return;
          const reqData = reqSnap.data();
          const companyRef = doc(db, 'companies', reqData.companyId);
          await updateDoc(companyRef, { allowedUsers: arrayUnion(reqData.userId) });
          await updateDoc(reqRef, {
            status: 'approved',
            handledAt: serverTimestamp(),
            handledBy: currentUser?.uid || null
          });
          setToast({ message: 'Request approved', type: 'success' });
          fetchData();
        } catch {
          setToast({ message: 'Failed to approve request', type: 'error' });
        }
      },
      onCancel: () => setModal({ open: false })
    });
  };

  // Reject join request with modal
  const confirmReject = (requestId, userName) => {
    setModal({
      open: true,
      title: 'Reject Join Request',
      message: `Reject ${userName || 'this user'}?`,
      onConfirm: async () => {
        setModal({ open: false });
        try {
          const reqRef = doc(db, 'joinRequests', requestId);
          await updateDoc(reqRef, {
            status: 'rejected',
            handledAt: serverTimestamp(),
            handledBy: currentUser?.uid || null
          });
          setToast({ message: 'Request rejected', type: 'success' });
          fetchData();
        } catch {
          setToast({ message: 'Failed to reject request', type: 'error' });
        }
      },
      onCancel: () => setModal({ open: false })
    });
  };

  // Filter reps based on search
  const filteredReps = reps.filter(rep => {
    const searchText = search.toLowerCase();
    return !searchText || 
      rep.name.toLowerCase().includes(searchText) ||
      rep.email.toLowerCase().includes(searchText);
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading reps data...</p>
      </div>
    );
  }

  return (
    <div className="reps-container">
      <div className="reps-header">
        <h2>Manage Reps</h2>
        <div className="reps-actions">
          <input
            type="text"
            placeholder="Search reps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      {joinRequests.length > 0 && (
        <div className="join-requests-section">
          <h3>Join Requests</h3>
          <div className="join-requests-list">
            {joinRequests.map(request => (
              <div key={request.id} className="join-request-card">
                <div className="request-info">
                  <div className="request-avatar">
                    {getInitials(request.userName, request.userEmail)}
                  </div>
                  <div className="request-details">
                    <h4>{request.userName || 'Unknown User'}</h4>
                    <p>{request.userEmail}</p>
                  </div>
                </div>
                <div className="request-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => confirmApprove(request.id, request.userName)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => confirmReject(request.id, request.userName)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reps-list">
        {filteredReps.map(rep => (
          <div key={rep.uid} className="rep-card">
            <div className="rep-info">
              <div className="rep-avatar">
                {getInitials(rep.name, rep.email)}
              </div>
              <div className="rep-details">
                <h4>{rep.name || 'Unknown User'}</h4>
                <p>{rep.email}</p>
              </div>
            </div>
            <div className="rep-actions">
              <select
                value={rep.role}
                onChange={e => handleRoleChange(rep.uid, e.target.value)}
                className="form-control"
              >
                <option value="rep">Rep</option>
                <option value="admin">Admin</option>
              </select>
              <button
                className="btn btn-danger"
                onClick={() => confirmRemove(rep.uid, rep.name)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="invite-section">
        <h3>Invite New Rep</h3>
        <div className="invite-form">
          <input
            type="email"
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="form-control"
          />
          <button
            className="btn btn-primary"
            onClick={handleInvite}
          >
            Send Invite
          </button>
        </div>
        {inviteError && <p className="error-message">{inviteError}</p>}
        {inviteSuccess && <p className="success-message">{inviteSuccess}</p>}
      </div>

      <ConfirmModal {...modal} />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />
    </div>
  );
}

export default RepManager; 