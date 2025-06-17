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
  // Placeholder state for reps, join requests, and invite email
  const [reps, setReps] = useState([]); // [{uid, name, email, role}]
  const [joinRequests, setJoinRequests] = useState([]); // [{id, userName, userEmail}]
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
          // ...same as handleApprove...
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

  // Invite rep
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    if (!inviteEmail.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setInviteError("Enter a valid email address.");
      return;
    }
    // TODO: Implement actual invite logic (e.g., send email, create invite doc)
    setInviteSuccess("Invite sent!");
    setInviteEmail("");
  };

  // Filtered reps/requests
  const filteredReps = reps.filter(rep => {
    const q = search.toLowerCase();
    return (
      rep.name.toLowerCase().includes(q) ||
      rep.email.toLowerCase().includes(q) ||
      rep.role.toLowerCase().includes(q)
    );
  });
  const filteredRequests = joinRequests.filter(req => {
    const q = search.toLowerCase();
    return (
      (req.userName || '').toLowerCase().includes(q) ||
      (req.userEmail || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="rep-manager-container">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
      <ConfirmModal {...modal} />
      <h2>Rep Manager</h2>
      <div className="rep-manager-header">
        <form className="invite-form" onSubmit={handleInvite}>
          <input
            type="email"
            placeholder="Invite rep by email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="invite-input"
            required
          />
          <button type="submit" className="btn btn-primary">Invite</button>
        </form>
        {inviteError && <div className="invite-error">{inviteError}</div>}
        {inviteSuccess && <div className="invite-success">{inviteSuccess}</div>}
        <input
          type="text"
          className="rep-search"
          placeholder="Search reps or requests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <section className="rep-section">
        <h3>Current Reps</h3>
        <div className="rep-list">
          {filteredReps.length === 0 ? (
            <div className="empty-message">No reps found.</div>
          ) : (
            filteredReps.map(rep => (
              <div className="rep-card" key={rep.uid}>
                <div className="rep-avatar">{getInitials(rep.name, rep.email)}</div>
                <div className="rep-info">
                  <div className="rep-name">{rep.name}</div>
                  <div className="rep-email">{rep.email}</div>
                </div>
                <div className="rep-role-edit">
                  <select
                    value={rep.role}
                    onChange={e => handleRoleChange(rep.uid, e.target.value)}
                    className="rep-role-select"
                  >
                    <option value="rep">Rep</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="rep-actions">
                  <button className="btn btn-danger" onClick={() => confirmRemove(rep.uid, rep.name)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="join-requests-section">
        <h3>Pending Join Requests</h3>
        <div className="rep-list">
          {filteredRequests.length === 0 ? (
            <div className="empty-message">No pending requests.</div>
          ) : (
            filteredRequests.map(req => (
              <div className="rep-card" key={req.id}>
                <div className="rep-avatar">{getInitials(req.userName, req.userEmail)}</div>
                <div className="rep-info">
                  <div className="rep-name">{req.userName}</div>
                  <div className="rep-email">{req.userEmail}</div>
                </div>
                <div className="rep-actions">
                  <button className="btn btn-primary" onClick={() => confirmApprove(req.id, req.userName)}>
                    Approve
                  </button>
                  <button className="btn btn-danger" style={{marginLeft: '0.5rem'}} onClick={() => confirmReject(req.id, req.userName)}>
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default RepManager; 