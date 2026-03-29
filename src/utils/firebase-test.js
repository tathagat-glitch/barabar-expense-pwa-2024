// Firebase configuration test utility
import { auth } from '../firebase';

export const testFirebaseAuth = () => {
  console.log('Firebase Auth Test:');
  console.log('Auth instance:', auth);
  console.log('Auth config:', auth.config);
  console.log('Current user:', auth.currentUser);
  
  // Test if auth is properly initialized
  if (!auth) {
    console.error('Auth is not initialized');
    return false;
  }
  
  // Check if email/password is enabled (this will be visible in console)
  console.log('Auth settings:', auth.settings);
  
  return true;
};

export const testPasswordReset = async (email) => {
  try {
    console.log('Testing password reset for:', email);
    const { sendPasswordResetEmail } = await import('../firebase');
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Password reset test failed:', error);
    return false;
  }
};
