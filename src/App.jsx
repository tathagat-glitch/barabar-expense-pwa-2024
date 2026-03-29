import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  auth,
  db,
  doc,
  getDoc,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from './firebase';
// Import PWA testing mode
import { isPWATesting, mockAuth, mockFirestore } from './pwa-testing-mode';
import AuthPage from './pages/AuthPage';
import GroupListPage from './pages/GroupListPage';
import GroupDetailPage from './pages/GroupDetailPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';

function Layout({ children, user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    navigate('/auth');
  };

  return (
    <div className="app-shell">
      <PWAInstallPrompt />
      <header className="app-header">
        <div className="app-title">Barabar</div>
        {user && (
          <button className="primary-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (!cancelled && snap.exists()) {
          setProfile(snap.data());
        } else if (!cancelled) {
          setProfile({});
        }
      })
      .catch(() => {
        if (!cancelled) setProfile({});
      });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const userInfo = useMemo(
    () =>
      user
        ? {
            uid: user.uid,
            email: user.email || '',
            username: profile?.username || ''
          }
        : null,
    [user, profile]
  );

  if (!authReady) {
    return (
      <div className="splash-screen">
        <div className="loader" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Layout user={userInfo}>
      <Routes>
        <Route
          path="/auth"
          element={userInfo ? <Navigate to="/groups" replace /> : <AuthPage />}
        />
        <Route
          path="/groups"
          element={
            <PrivateRoute user={userInfo}>
              <GroupListPage user={userInfo} />
            </PrivateRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <PrivateRoute user={userInfo}>
              <GroupDetailPage user={userInfo} />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>
    </Layout>
  );
}

