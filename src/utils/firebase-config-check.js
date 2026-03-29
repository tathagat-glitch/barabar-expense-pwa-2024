// Firebase Configuration Checker
import { auth } from '../firebase';

export const checkFirebaseConfig = () => {
  console.log('🔍 Firebase Configuration Check');
  console.log('================================');
  
  // Check auth instance
  if (!auth) {
    console.error('❌ Auth instance not found');
    return false;
  }
  
  console.log('✅ Auth instance found');
  
  // Check auth configuration
  if (auth.config) {
    console.log('✅ Auth config:', auth.config);
  } else {
    console.log('⚠️  Auth config not accessible');
  }
  
  // Check app settings
  if (auth.settings) {
    console.log('✅ Auth settings:', auth.settings);
  } else {
    console.log('⚠️  Auth settings not accessible');
  }
  
  // Check current user
  if (auth.currentUser) {
    console.log('✅ Current user:', auth.currentUser.email);
  } else {
    console.log('ℹ️  No current user (this is expected for password reset)');
  }
  
  // Check if we're in development mode
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('192.168') ||
                window.location.hostname.includes('127.0.0.1');
  
  console.log('ℹ️  Environment:', isDev ? 'Development' : 'Production');
  
  if (isDev && auth.settings?.appVerificationDisabledForTesting) {
    console.log('✅ reCAPTCHA disabled for testing');
  }
  
  return true;
};

export const testEmailService = async () => {
  console.log('📧 Testing Email Service');
  console.log('========================');
  
  try {
    const { sendPasswordResetEmail } = await import('../firebase');
    
    // Test with a dummy email (this will fail but tells us if the service is reachable)
    await sendPasswordResetEmail(auth, 'test@example.com');
    console.log('✅ Email service is working');
    return true;
  } catch (error) {
    console.log('📧 Email Service Test Results:');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    // Analyze the error
    if (error.code === 'auth/user-not-found') {
      console.log('✅ Email service is working (user-not-found is expected for test email)');
      return true;
    } else if (error.code === 'auth/invalid-email') {
      console.log('✅ Email service is working (invalid-email is expected for test email)');
      return true;
    } else if (error.message.includes('auth/configuration-not-found')) {
      console.log('❌ Firebase Auth is not properly configured');
      console.log('💡 Solution: Enable Email/Password authentication in Firebase Console');
      return false;
    } else if (error.message.includes('auth-domain-config-required')) {
      console.log('❌ Auth domain configuration is missing');
      console.log('💡 Solution: Check authDomain in firebase config');
      return false;
    } else {
      console.log('❓ Unknown error - check Firebase Console configuration');
      return false;
    }
  }
};
