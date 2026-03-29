import React, { useEffect, useState } from 'react';
import {
  db,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function GroupListPage({ user }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(
        groupsRef,
        where('memberUids', 'array-contains', user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGroups(list);
    } catch (err) {
      console.error(err);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const groupsRef = collection(db, 'groups');
      const docRef = await addDoc(groupsRef, {
        name: newName.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        memberUids: [user.uid]
      });

      const memberRef = doc(db, 'groups', docRef.id, 'members', user.uid);
      await setDoc(memberRef, {
        uid: user.uid,
        email: user.email,
        username: user.username || '',
        createdAt: serverTimestamp()
      });

      setNewName('');
      await fetchGroups();
    } catch (err) {
      console.error(err);
      setError('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    setDeleting(groupId);
    setError('');
    try {
      // Delete the group document
      await deleteDoc(doc(db, 'groups', groupId));
      
      // Remove from local state
      setGroups(groups.filter(g => g.id !== groupId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      setError('Failed to delete group');
    } finally {
      setDeleting(null);
    }
  };

  const confirmDeleteGroup = (group) => {
    setShowDeleteConfirm(group);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  return (
    <div className="page">
      <h1 className="page-title">Your groups</h1>

      <form className="card" onSubmit={handleCreateGroup}>
        <label className="field">
          <span>New group name</span>
          <input
            type="text"
            placeholder="Goa Trip, Family..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <button className="primary-button" disabled={creating}>
          {creating ? 'Creating...' : 'Create group'}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>

      <section className="card list-card">
        <div className="list-header">
          <h2>Groups</h2>
          <button className="icon-button" onClick={fetchGroups}>
            ⟳
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : groups.length === 0 ? (
          <p className="muted">No groups yet. Create your first one above.</p>
        ) : (
          <ul className="list">
            {groups.map((g) => (
              <li
                key={g.id}
                className="list-item"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <div>
                  <div className="item-title">{g.name}</div>
                  <div className="item-subtitle">
                    {g.lastExpenseDescription || 'No expenses yet'}
                  </div>
                </div>
                <div className="item-actions">
                  {g.createdBy === user.uid && (
                    <button
                      className="icon-button delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteGroup(g);
                      }}
                      disabled={deleting === g.id}
                      title="Delete group"
                    >
                      {deleting === g.id ? '...' : '🗑️'}
                    </button>
                  )}
                  <span className="chevron">›</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="dialog-overlay" onClick={cancelDelete}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Group</h3>
            <p>
              Are you sure you want to delete "<strong>{showDeleteConfirm.name}</strong>"?
            </p>
            <p className="muted">
              This action cannot be undone. All expenses and data will be permanently deleted.
            </p>
            <div className="dialog-actions">
              <button
                className="ghost-button"
                onClick={cancelDelete}
                disabled={deleting === showDeleteConfirm.id}
              >
                Cancel
              </button>
              <button
                className="primary-button danger-button"
                onClick={() => handleDeleteGroup(showDeleteConfirm.id)}
                disabled={deleting === showDeleteConfirm.id}
              >
                {deleting === showDeleteConfirm.id ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

