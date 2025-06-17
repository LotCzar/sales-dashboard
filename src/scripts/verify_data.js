import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'serviceAccount.json'), 'utf8')
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const COMPANY_ID = '0NHKpgAGPquHAdK7i454';

async function verifyData() {
  try {
    console.log("Starting data verification...");
    
    // 1. Check company document
    const companyDoc = await db.collection('companies').doc(COMPANY_ID).get();
    console.log("\nCompany document data:");
    console.log(companyDoc.data());
    
    // 2. Check regions collection
    const regionsRef = db.collection('companies').doc(COMPANY_ID).collection('regions');
    const regionsSnapshot = await regionsRef.get();
    
    console.log("\nRegions found:");
    regionsSnapshot.forEach(doc => {
      console.log(`\nRegion: ${doc.id}`);
      const data = doc.data();
      console.log(`Number of stores: ${data.stores?.length || 0}`);
      if (data.stores?.length > 0) {
        console.log("First store:", data.stores[0]);
      }
    });
    
    console.log("\nTotal regions found:", regionsSnapshot.size);
    
  } catch (error) {
    console.error("Error during verification:", error);
    throw error;
  }
}

// Run the verification
console.log("Starting data verification...");
verifyData()
  .then(() => {
    console.log("\nVerification complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 