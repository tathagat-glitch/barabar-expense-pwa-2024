// Temporary PWA testing mode - bypass Firebase
export const isPWATesting = window.location.hostname === '192.168.0.121';

// Mock auth for PWA testing
export const mockAuth = {
  currentUser: isPWATesting ? { 
    uid: 'demo-user', 
    email: 'demo@barabar.com' 
  } : null,
  onAuthStateChanged: (callback) => {
    if (isPWATesting) {
      setTimeout(() => callback({ uid: 'demo-user', email: 'demo@barabar.com' }), 100);
    }
    return () => {};
  }
};

// Mock Firestore for PWA testing
export const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: true, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve()
    }),
    get: () => Promise.resolve([])
  })
};
