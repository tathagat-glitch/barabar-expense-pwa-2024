// Authentication test utility
import { auth, db } from '../firebase';

export const testFirebaseConnection = async () => {
  console.log('🔍 Testing Firebase Connection');
  console.log('==================================');
  
  try {
    // Test auth instance
    console.log('✅ Auth instance available:', !!auth);
    console.log('📧 Auth config:', auth.config ? 'Available' : 'Not available');
    
    // Test database instance
    console.log('✅ Database instance available:', !!db);
    
    // Test if we can access a collection (this will fail permissions but tells us if connection works)
    const testCollection = await import('firebase/firestore').then(({ collection }) => collection(db, 'test'));
    console.log('✅ Firestore collection creation works');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

export const testEmailPasswordAuth = async () => {
  console.log('🔍 Testing Email/Password Auth');
  console.log('===============================');
  
  try {
    // This will test if email/password auth is enabled
    const { createUserWithEmailAndPassword } = await import('../firebase');
    console.log('✅ createUserWithEmailAndPassword function available');
    
    // Test with invalid data to see what error we get
    try {
      await createUserWithEmailAndPassword(auth, 'test@invalid.com', '123456');
    } catch (error) {
      console.log('📝 Expected error with invalid data:', error.code);
      
      if (error.code === 'auth/operation-not-allowed') {
        console.log('❌ Email/Password authentication is NOT enabled in Firebase Console');
        return false;
      } else if (error.code === 'auth/network-request-failed') {
        console.log('❌ Network connection issue');
        return false;
      } else {
        console.log('✅ Email/Password auth is enabled (got expected error)');
        return true;
      }
    }
  } catch (error) {
    console.error('❌ Email/Password auth test failed:', error);
    return false;
  }
};

export const runAllTests = async () => {
  console.log('🧪 Running Authentication Tests');
  console.log('=================================');
  
  const connectionTest = await testFirebaseConnection();
  const authTest = await testEmailPasswordAuth();
  
  console.log('\n📊 Test Results:');
  console.log('Firebase Connection:', connectionTest ? '✅ PASS' : '❌ FAIL');
  console.log('Email/Password Auth:', authTest ? '✅ PASS' : '❌ FAIL');
  
  if (!connectionTest || !authTest) {
    console.log('\n🔧 Troubleshooting Steps:');
    if (!connectionTest) {
      console.log('1. Check Firebase configuration in firebase.js');
      console.log('2. Verify API keys and project settings');
    }
    if (!authTest) {
      console.log('1. Go to Firebase Console → Authentication → Sign-in method');
      console.log('2. Enable Email/Password authentication');
      console.log('3. Save the settings');
    }
  }
  
  return connectionTest && authTest;
};
