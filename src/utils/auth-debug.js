// Authentication debugging utility
import { auth } from '../firebase';

export const debugAuth = () => {
  console.log('🔐 Authentication Debug Info');
  console.log('============================');
  
  console.log('Auth instance:', !!auth);
  console.log('Current user:', auth.currentUser);
  console.log('Auth config:', auth.config);
  
  // Check if we're in development
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('192.168');
  console.log('Environment:', isDev ? 'Development' : 'Production');
  
  if (auth.settings) {
    console.log('Auth settings:', auth.settings);
  }
};

export const testCredentials = async (email, password) => {
  console.log('🧪 Testing Credentials');
  console.log('======================');
  console.log('Email:', email);
  console.log('Password length:', password ? password.length : 0);
  
  if (!email || !password) {
    console.log('❌ Missing email or password');
    return false;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format');
    return false;
  }
  
  console.log('✅ Credentials format looks valid');
  return true;
};

export const listUsers = async () => {
  console.log('👥 This would list users if admin SDK was available');
  console.log('Note: User listing requires Firebase Admin SDK (server-side only)');
  
  // Client-side can't list users for security reasons
  // This would need to be done server-side with Admin SDK
};
