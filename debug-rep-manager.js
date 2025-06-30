const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase config from the dashboard
const firebaseConfig = {
  apiKey: "AIzaSyBT_0C2GRh-JZ0Xb5cHEn7pMv1DGQi8dxE",
  authDomain: "sell-it-pinesny.firebaseapp.com",
  projectId: "sell-it-pinesny",
  storageBucket: "sell-it-pinesny.appspot.com",
  messagingSenderId: "515475349801",
  appId: "1:515475349801:web:bbec06f61b568bd2951738"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugRepManager(companyId, userId) {
  try {
    console.log(`🔍 Debugging RepManager for company: ${companyId}`);
    console.log(`🔍 Checking user: ${userId}`);
    
    // 1. Check company document
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      console.log('❌ Company document not found');
      return;
    }
    
    const companyData = companySnap.data();
    const allowedUsers = companyData.allowedUsers || [];
    
    console.log('📋 Company data:', JSON.stringify(companyData, null, 2));
    console.log('👥 Allowed users:', allowedUsers);
    console.log(`🔍 Is user in allowedUsers? ${allowedUsers.includes(userId)}`);
    
    // 2. Check user document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userSnap.data();
    console.log('📋 User data:', JSON.stringify(userData, null, 2));
    
    // 3. Check what RepManager would see
    const repData = {
      uid: userId,
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'rep',
    };
    
    console.log('📋 RepManager would see:', JSON.stringify(repData, null, 2));
    
    // 4. Check if name field is missing (this is likely the issue)
    if (!userData.name || userData.name.trim() === '') {
      console.log('❌ PROBLEM: name field is missing or empty');
      console.log('   - repName field:', userData.repName || 'missing');
      console.log('   - name field:', userData.name || 'missing');
    } else {
      console.log('✅ name field exists:', userData.name);
    }
    
    // 5. Check if email field is missing
    if (!userData.email || userData.email.trim() === '') {
      console.log('❌ PROBLEM: email field is missing or empty');
    } else {
      console.log('✅ email field exists:', userData.email);
    }
    
    // 6. Check if role field is missing
    if (!userData.role || userData.role.trim() === '') {
      console.log('❌ PROBLEM: role field is missing or empty');
    } else {
      console.log('✅ role field exists:', userData.role);
    }
    
    // 7. Simulate what RepManager would display
    if (allowedUsers.includes(userId)) {
      if (userSnap.exists()) {
        const data = userSnap.data();
        const rep = {
          uid: userId,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'rep',
        };
        
        if (rep.name && rep.email) {
          console.log('✅ User should appear in RepManager');
          console.log('   Display name:', rep.name);
          console.log('   Display email:', rep.email);
          console.log('   Display role:', rep.role);
        } else {
          console.log('❌ User would appear but with missing data');
          console.log('   Display name:', rep.name || 'empty');
          console.log('   Display email:', rep.email || 'empty');
          console.log('   Display role:', rep.role || 'empty');
        }
      } else {
        console.log('❌ User would appear as "Unknown User" (no user document)');
      }
    } else {
      console.log('❌ User is not in allowedUsers array - this is the problem!');
    }
    
  } catch (error) {
    console.error('❌ Error debugging RepManager:', error);
  }
}

// Run with your actual IDs from the logs
debugRepManager('0NHKpgAGPquHAdK7i454', 'DGGySAVzK4PI5gBwPrs3hwyG7zx1');

module.exports = { debugRepManager }; 