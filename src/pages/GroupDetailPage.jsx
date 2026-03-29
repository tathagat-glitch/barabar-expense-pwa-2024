import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove
} from '../firebase';
import { computeBalances } from '../utils/balance';

export default function GroupDetailPage({ user }) {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState([]);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
  const [customAmounts, setCustomAmounts] = useState({}); // { uid: "123.45" }
  const [savingExpense, setSavingExpense] = useState(false);
  const [expError, setExpError] = useState('');

  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [savingSettle, setSavingSettle] = useState(false);
  const [settleError, setSettleError] = useState('');

  const [inviteInput, setInviteInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [currency, setCurrency] = useState('INR');

  const currencies = {
    INR: { symbol: '₹', name: 'Indian Rupee' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    THB: { symbol: '฿', name: 'Thai Baht' }
  };

  const memberMap = useMemo(() => {
    const m = {};
    for (const mem of members) {
      m[mem.uid] = mem;
    }
    return m;
  }, [members]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      setGroup({ id: groupSnap.id, ...groupSnap.data() });

      const membersRef = collection(db, 'groups', groupId, 'members');
      const membersSnap = await getDocs(membersRef);
      const memList = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMembers(memList);

      // Backfill usernames on member docs from user profiles if missing
      const missingUsername = memList.filter(
        (m) => m.uid && !m.username
      );
      if (missingUsername.length > 0) {
        const updates = await Promise.all(
          missingUsername.map(async (m) => {
            try {
              const profileSnap = await getDoc(doc(db, 'users', m.uid));
              if (profileSnap.exists()) {
                const data = profileSnap.data();
                if (data.username) {
                  await setDoc(
                    doc(db, 'groups', groupId, 'members', m.uid),
                    { username: data.username },
                    { merge: true }
                  );
                  return { uid: m.uid, username: data.username };
                }
              }
            } catch {
              // ignore individual failures
            }
            return null;
          })
        );
        const enriched = updates.filter(Boolean);
        if (enriched.length > 0) {
          const map = {};
          enriched.forEach((u) => {
            map[u.uid] = u.username;
          });
          setMembers((current) =>
            current.map((m) =>
              map[m.uid] ? { ...m, username: map[m.uid] } : m
            )
          );
        }
      }

      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const expQuery = query(expensesRef, orderBy('createdAt', 'desc'));
      const expSnap = await getDocs(expQuery);
      setExpenses(expSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const settlementsRef = collection(db, 'groups', groupId, 'settlements');
      const settleQuery = query(settlementsRef, orderBy('createdAt', 'desc'));
      const settleSnap = await getDocs(settleQuery);
      setSettlements(
        settleSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [groupId]);

  useEffect(() => {
    if (members.length > 0 && !paidBy) {
      setPaidBy(user.uid);
      setSplitBetween(members.map((m) => m.uid));
    }
  }, [members, user.uid, paidBy]);

  const toggleSplitMember = (uid) => {
    setSplitBetween((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  // When switching to custom, pre-fill with equal split
  const switchToCustom = () => {
    setSplitMode('custom');
    const total = parseFloat(amount);
    if (!isNaN(total) && total > 0 && splitBetween.length > 0) {
      const each = total / splitBetween.length;
      const next = {};
      splitBetween.forEach((uid) => {
        next[uid] = (Math.round(each * 100) / 100).toFixed(2);
      });
      setCustomAmounts(next);
    } else {
      setCustomAmounts({});
    }
  };

  const setCustomAmount = (uid, value) => {
    setCustomAmounts((prev) => ({ ...prev, [uid]: value }));
  };

  const customTotal = useMemo(() => {
    return Object.values(customAmounts).reduce((sum, str) => {
      const n = parseFloat(str);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [customAmounts]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setExpError('');
    const value = parseFloat(amount);
    if (!desc.trim() || isNaN(value) || value <= 0) {
      setExpError('Please enter valid description and amount');
      return;
    }
    if (!paidBy) {
      setExpError('Select who paid');
      return;
    }
    if (splitMode === 'equal') {
      if (!splitBetween.length) {
        setExpError('Select at least one member to split with');
        return;
      }
    } else {
      const sum = Math.round(customTotal * 100) / 100;
      const totalRounded = Math.round(value * 100) / 100;
      if (Math.abs(sum - totalRounded) > 0.02) {
        setExpError(`Custom amounts must add up to ${formatAmount(value)} (currently ${formatAmount(sum)})`);
        return;
      }
      const hasPositive = Object.values(customAmounts).some((s) => parseFloat(s) > 0);
      if (!hasPositive) {
        setExpError('Enter at least one amount greater than 0');
        return;
      }
    }

    setSavingExpense(true);
    try {
      const ref = collection(db, 'groups', groupId, 'expenses');
      const payload = {
        description: desc.trim(),
        amount: value,
        currency,
        paidBy,
        splitType: splitMode,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };
      if (splitMode === 'equal') {
        payload.splitBetween = splitBetween;
      } else {
        const splits = {};
        Object.entries(customAmounts).forEach(([uid, str]) => {
          const n = parseFloat(str);
          if (!isNaN(n) && n > 0) splits[uid] = Math.round(n * 100) / 100;
        });
        payload.splitBetween = Object.keys(splits);
        payload.customSplits = splits;
      }
      await addDoc(ref, payload);
      setDesc('');
      setAmount('');
      setSplitMode('equal');
      setCustomAmounts({});
      await loadAll();
    } catch (err) {
      console.error(err);
      setExpError('Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleAddSettlement = async (e) => {
    e.preventDefault();
    setSettleError('');
    const value = parseFloat(settleAmount);
    if (!settleFrom || !settleTo || settleFrom === settleTo) {
      setSettleError('Choose two different members');
      return;
    }
    if (isNaN(value) || value <= 0) {
      setSettleError('Enter valid amount');
      return;
    }
    setSavingSettle(true);
    try {
      const ref = collection(db, 'groups', groupId, 'settlements');
      await addDoc(ref, {
        from: settleFrom,
        to: settleTo,
        amount: value,
        currency,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setSettleAmount('');
      await loadAll();
    } catch (err) {
      console.error(err);
      setSettleError('Failed to record settlement');
    } finally {
      setSavingSettle(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setInviteError('');
    const input = inviteInput.trim();
    if (!input) {
      setInviteError('Enter an email or username');
      return;
    }

    setInviting(true);
    try {
      let targetUid = '';
      let targetEmail = '';
      let targetUsername = '';

      if (input.includes('@')) {
        // Email lookup (requires users read for signed-in users)
        const usersRef = collection(db, 'users');
        const snap = await getDocs(
          query(usersRef, where('email', '==', input.toLowerCase()))
        );
        if (snap.empty) {
          setInviteError('No user found with that email');
          setInviting(false);
          return;
        }
        const userDoc = snap.docs[0];
        targetUid = userDoc.id;
        const data = userDoc.data();
        targetEmail = data.email || '';
        targetUsername = data.username || '';
      } else {
        // Username lookup via unique mapping
        const key = input.toLowerCase();
        const usernameSnap = await getDoc(doc(db, 'usernames', key));
        if (!usernameSnap.exists()) {
          setInviteError('No user found with that username');
          setInviting(false);
          return;
        }
        targetUid = usernameSnap.data().uid;
        const profileSnap = await getDoc(doc(db, 'users', targetUid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          targetEmail = data.email || '';
          targetUsername = data.username || input;
        } else {
          targetUsername = input;
        }
      }

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberUids: arrayUnion(targetUid)
      });

      const memberRef = doc(db, 'groups', groupId, 'members', targetUid);
      await setDoc(
        memberRef,
        {
          uid: targetUid,
          email: targetEmail,
          username: targetUsername,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );

      setInviteInput('');
      await loadAll();
    } catch (err) {
      console.error(err);
      setInviteError('Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (uid) => {
    setInviteError('');
    if (!group || uid === group.createdBy) {
      return;
    }
    // Optional: prevent self-removal for now; removing self could be a separate "Leave group" action
    if (uid === user.uid) {
      setInviteError('Leaving a group is not supported yet.');
      return;
    }
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        memberUids: arrayRemove(uid)
      });
      await deleteDoc(doc(db, 'groups', groupId, 'members', uid));
      await loadAll();
    } catch (err) {
      console.error(err);
      setInviteError('Failed to remove member');
    }
  };

  const { net, debts } = useMemo(
    () => computeBalances(expenses, settlements),
    [expenses, settlements]
  );

  const formatUser = (uid) =>
    memberMap[uid]?.username || memberMap[uid]?.email || memberMap[uid]?.uid || uid;

  const formatAmount = (amount, currencyCode = 'INR') => {
    const symbol = currencies[currencyCode]?.symbol || '₹';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatExpenseDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return '';
    }
  };

  const getExpenseSplitSummary = (exp) => {
    if (exp.splitType === 'custom' && exp.customSplits && typeof exp.customSplits === 'object') {
      const parts = Object.entries(exp.customSplits)
        .filter(([, v]) => Number(v) > 0)
        .map(([uid, amt]) => `${formatUser(uid)} ${formatAmount(Number(amt), exp.currency)}`);
      return parts.length ? `Custom: ${parts.join(' · ')}` : 'Custom split';
    }
    const between = exp.splitBetween || [];
    if (between.length === 0) return '—';
    const share = exp.amount / between.length;
    return `Equal: ${between.map((uid) => formatUser(uid)).join(', ')} (${formatAmount(share, exp.currency)} each)`;
  };

  if (loading && !group) {
    return (
      <div className="page">
        <p>Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page">
        <p>Group not found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{group.name}</h1>

      <section className="card">
        <h2>Members</h2>
        <ul className="list compact">
          {members.map((m) => (
            <li key={m.uid} className="list-item">
              <span>{m.username || m.email || m.uid}</span>
              {group.createdBy === user.uid && m.uid !== group.createdBy && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleRemoveMember(m.uid)}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {group.createdBy === user.uid && (
          <form onSubmit={handleInviteMember} className="form-vertical">
            <label className="field">
              <span>Add member by email or username</span>
              <input
                type="text"
                placeholder="email or username"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
              />
            </label>
            {inviteError && <p className="error-text">{inviteError}</p>}
            <button className="primary-button" disabled={inviting}>
              {inviting ? 'Adding...' : 'Add to group'}
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Balances</h2>
        {Object.keys(net).length === 0 ? (
          <p className="muted">No expenses yet.</p>
        ) : (
          <>
            <ul className="list compact">
              {Object.entries(net).map(([uid, value]) => {
                const amt = Math.round(value * 100) / 100;
                let label = 'settled up';
                if (amt > 0.01) label = `should receive ${formatAmount(amt)}`;
                else if (amt < -0.01) label = `owes ${formatAmount(-amt)}`;
                return (
                  <li key={uid} className="list-item">
                    <span>{formatUser(uid)}</span>
                    <span className="item-subtitle">{label}</span>
                  </li>
                );
              })}
            </ul>
            {debts.length > 0 && (
              <div className="debts-summary">
                <h3>Who owes whom</h3>
                <ul className="list compact">
                  {debts.map((d, i) => (
                    <li key={i} className="list-item">
                      <span>
                        {formatUser(d.from)} → {formatUser(d.to)}
                      </span>
                      <span>{formatAmount(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card">
        <h2>Add expense</h2>
        <form onSubmit={handleAddExpense} className="form-vertical">
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              placeholder="Dinner, Taxi..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Amount ({currencies[currency].symbol})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {Object.entries(currencies).map(([code, { name, symbol }]) => (
                <option key={code} value={code}>
                  {symbol} {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Who paid</span>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {formatUser(m.uid)}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>How to split</span>
            <div className="split-mode-toggle">
              <button
                type="button"
                className={`chip ${splitMode === 'equal' ? 'chip-active' : ''}`}
                onClick={() => setSplitMode('equal')}
              >
                Split equally
              </button>
              <button
                type="button"
                className={`chip ${splitMode === 'custom' ? 'chip-active' : ''}`}
                onClick={switchToCustom}
              >
                Custom amounts
              </button>
            </div>
          </div>

          {splitMode === 'equal' ? (
            <div className="field">
              <span>Split between</span>
              <div className="chips">
                {members.map((m) => {
                  const active = splitBetween.includes(m.uid);
                  return (
                    <button
                      key={m.uid}
                      type="button"
                      className={`chip ${active ? 'chip-active' : ''}`}
                      onClick={() => toggleSplitMember(m.uid)}
                    >
                      {formatUser(m.uid)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="field">
              <span>Amount per person (₹)</span>
              {splitBetween.length === 0 ? (
                <p className="muted">Select "Split equally" and choose people first, then switch back to custom to edit amounts.</p>
              ) : (
                <>
                  <ul className="custom-splits-list">
                    {splitBetween.map((uid) => (
                      <li key={uid} className="list-item custom-split-row">
                        <span className="custom-split-label">{formatUser(uid)}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={customAmounts[uid] ?? ''}
                          onChange={(e) => setCustomAmount(uid, e.target.value)}
                          className="custom-split-input"
                        />
                      </li>
                    ))}
                  </ul>
                  <p className={`custom-split-total ${Math.abs(customTotal - parseFloat(amount || 0)) > 0.02 ? 'error-text' : 'muted'}`}>
                    Total: {formatAmount(customTotal)} / {formatAmount(parseFloat(amount) || 0)}
                  </p>
                </>
              )}
            </div>
          )}

          {expError && <p className="error-text">{expError}</p>}
          <button className="primary-button" disabled={savingExpense}>
            {savingExpense ? 'Saving...' : 'Add expense'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Mark debt as settled</h2>
        <form onSubmit={handleAddSettlement} className="form-vertical">
          <label className="field">
            <span>From</span>
            <select
              value={settleFrom}
              onChange={(e) => setSettleFrom(e.target.value)}
            >
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {formatUser(m.uid)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>To</span>
            <select
              value={settleTo}
              onChange={(e) => setSettleTo(e.target.value)}
            >
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {formatUser(m.uid)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount ({currencies[currency].symbol})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
            />
          </label>
          {settleError && <p className="error-text">{settleError}</p>}
          <button className="primary-button" disabled={savingSettle}>
            {savingSettle ? 'Saving...' : 'Record settlement'}
          </button>
        </form>
      </section>

      <section className="card expense-history-card">
        <div className="list-header">
          <h2>Expense history</h2>
          {expenses.length > 0 && (
            <span className="expense-count">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {expenses.length === 0 ? (
          <p className="muted">No expenses yet. Add one above.</p>
        ) : (
          <ul className="list expense-history-list">
            {expenses.map((e) => (
              <li key={e.id} className="list-item expense-history-item">
                <div className="expense-history-main">
                  <div className="item-title">{e.description}</div>
                  <div className="item-subtitle">
                    Paid by {formatUser(e.paidBy)} · {getExpenseSplitSummary(e)}
                  </div>
                  {e.createdAt && (
                    <div className="expense-history-date">{formatExpenseDate(e.createdAt)}</div>
                  )}
                </div>
                <span className="expense-history-amount">{formatAmount(e.amount, e.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Settlements</h2>
        {settlements.length === 0 ? (
          <p className="muted">No settlements recorded.</p>
        ) : (
          <ul className="list compact">
            {settlements.map((s) => (
              <li key={s.id} className="list-item">
                <span>
                  {formatUser(s.from)} → {formatUser(s.to)}
                </span>
                <span>{formatAmount(s.amount, s.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
