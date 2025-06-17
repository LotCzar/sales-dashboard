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

const CORRECT_ID = '0NHKpgAGPquHAdK7i454';
const IDS_TO_DELETE = [
  '4rVvLk2oFTwZfnN2sjJi',
  'XZRpZbIdOOYi1zEEvVTw',
  'srJa1TIca8IphYgUixI4',
  'tZRAnHCuxEjL2UmoAjwO',
  'pinesny' // The one created by our recent script
];

async function deleteDuplicates() {
  try {
    console.log("Starting duplicate deletion process...");
    
    for (const id of IDS_TO_DELETE) {
      console.log(`Deleting document with ID: ${id}`);
      
      // Delete the main document
      await db.collection('companies').doc(id).delete();
      
      // Delete its regions subcollection
      const regionsRef = db.collection('companies').doc(id).collection('regions');
      const regionsSnapshot = await regionsRef.get();
      
      const batch = db.batch();
      regionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✓ Deleted document ${id} and its regions`);
    }
    
    console.log("\nSuccessfully deleted all duplicate documents!");
    
  } catch (error) {
    console.error("Error during deletion:", error);
    throw error;
  }
}

// Run the deletion script
console.log("Starting duplicate deletion...");
deleteDuplicates()
  .then(() => {
    console.log("Successfully deleted all duplicates!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 