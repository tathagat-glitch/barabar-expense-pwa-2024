// Test PWA install prompt
console.log('Testing PWA install criteria...');

// Check if service worker is supported
if ('serviceWorker' in navigator) {
  console.log('✅ Service Worker API is supported');
  
  // Check if service worker is ready
  navigator.serviceWorker.ready.then(registration => {
    console.log('✅ Service worker is ready:', registration);
    
    // Check if beforeinstallprompt event fires
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎯 REAL Install prompt event fired!', e);
      console.log('Event has prompt method:', typeof e.prompt);
      
      // Don't prevent default - let the natural install flow work
      // e.preventDefault();
      
      // Show install button with real event
      const installBtn = document.createElement('button');
      installBtn.textContent = 'Install App (REAL)';
      installBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
      `;
      
      installBtn.onclick = () => {
        if (e && typeof e.prompt === 'function') {
          e.prompt();
          e.userChoice.then(choice => {
            console.log('User choice:', choice);
            installBtn.remove();
          });
        } else {
          console.log('❌ Real install prompt not available');
          installBtn.textContent = 'Install Not Available';
        }
      };
      
      document.body.appendChild(installBtn);
    });
    
    console.log('📍 Waiting for REAL install prompt event...');
    
    // Check PWA criteria after 2 seconds
    setTimeout(() => {
      console.log('🔍 Checking PWA install criteria...');
      
      // Check if page is served over HTTPS
      const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.startsWith('192.168.');
      console.log('HTTPS/Local:', isHTTPS);
      
      // Check if service worker is registered
      console.log('Service worker registered:', !!registration);
      
      // Check if manifest is valid
      fetch('/manifest.json')
        .then(response => response.json())
        .then(manifest => {
          console.log('Manifest valid:', !!manifest.name && !!manifest.icons);
          console.log('Manifest icons:', manifest.icons?.length || 0);
        })
        .catch(err => console.log('Manifest error:', err));
        
    }, 2000);
    
  }).catch(err => {
    console.error('❌ Service worker not ready:', err);
  });
} else {
  console.error('❌ Service Worker API not supported in this browser');
}

// Manual install trigger for testing (FAKE - only for testing UI)
window.testInstall = () => {
  console.log('🔧 Testing FAKE install (UI only)...');
  const event = new Event('beforeinstallprompt');
  window.dispatchEvent(event);
};
