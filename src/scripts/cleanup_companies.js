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

async function cleanupCompanies() {
  try {
    console.log("Starting company cleanup process...");
    
    // Get all companies with name PinesNY
    const companiesRef = db.collection('companies');
    const snapshot = await companiesRef.get();
    
    console.log("\nFound documents:");
    snapshot.forEach(doc => {
      console.log(`ID: ${doc.id}`);
      console.log("Data:", doc.data());
      console.log("---");
    });

    // Ask for confirmation before deletion
    console.log("\nPlease review the documents above and run the cleanup script with the correct company ID to keep.");
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

// Run the cleanup script
console.log("Starting company document listing...");
cleanupCompanies()
  .then(() => {
    console.log("Successfully listed all company documents!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 