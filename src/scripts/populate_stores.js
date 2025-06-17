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

const storesByRegion = {
  "Bronx": [
    "New York City Cannabis Emporium",
    "I Bud You",
    "Smoking Scholars",
    "SESH NYC",
    "Freshly Baked NYC",
    "Hibernica",
    "Bleu Leaf Dispensary",
    "Two Buds Dispensary",
    "My Bud 420",
    "Conbud",
    "BRONX JOINT"
  ],
  "Brooklyn": [
    "Grow Together",
    "Kushmart",
    "Stashmaster",
    "The Plug",
    "R & R Remedies",
    "Fire Leaf",
    "Twisted Vibration",
    "Brooklyn Bourne Dispensary",
    "Society House",
    "HERBOLOGY",
    "Yerba Buena",
    "The Flowery",
    "XANDER LEGACY",
    "Caffiend",
    "Jungle Kingdom Flower",
    "Coney Island Cannabis",
    "Chronic Brooklyn",
    "Beleaf",
    "Hii Cannabis",
    "Misha's Flower Shop",
    "Clifton Hill Cannabis Dispensary",
    "The Travel Agency",
    "Happy Munkey",
    "Puro Vito",
    "Matawana",
    "OC DISPENSARY",
    "The Spot Dispensary",
    "The Emerald Dispensary",
    "Tiki Leaves",
    "BK Exotic"
  ],
  "Capital District": [
    "420 Bliss",
    "Capital District Cannabis and Wellness",
    "Cannabicity",
    "Ripe Cannabis",
    "Cannabis Central",
    "Sashies Dispensary",
    "Gotham Dispensary",
    "Mister Greens",
    "High Peaks Canna",
    "Reef",
    "State of Mind Dispensary",
    "The People's Joint",
    "High Society",
    "RR Legacy Dispensary",
    "Grass & Goodness Cannabis Store",
    "Windy Hill Wellness",
    "Electric City Cannabis Co",
    "Cussin's Cannabis",
    "Robinson's Dispensary",
    "Stage One Dispensary",
    "Silver Therapeutics",
    "WILDE ROOTS DISPENSARY",
    "Evexia Cannabis",
    "Hold Up Roll Up",
    "TRANSCEND WELLNESS PRODUCTS & SERVICES",
    "BUDD's Dispensary",
    "THTree",
    "Mr Good Vybz",
    "Leafy Peaks",
    "Upstate Canna Co",
    "The Bakery",
    "No Name Cannabis Company",
    "RIVERBEND DISPENSARY",
    "Lucky Dog 420",
    "Brownies",
    "Legacy Dispensary",
    "Royale Flower",
    "Northern Lights NY",
    "High Tolerance"
  ],
  "Central NY": [
    "TJ's Cannabis",
    "Classy Canna",
    "VedaLeaf",
    "Herb-Z",
    "Diamond Tree Dispensary",
    "The Higher Company",
    "FLYNNSTONED",
    "Flynnstoned",
    "Leafy Wonders",
    "Salmon River Cannabis",
    "Joe's Buds",
    "JUST BREATHE SYRACUSE",
    "Wild Flower",
    "Loudpack Exotics",
    "Raven's Joint"
  ],
  "Finger Lakes": [
    "MJ Dispensary",
    "SessCo",
    "Flower City Dispensary",
    "FingerLakes Cannabis Co.",
    "Buddeez",
    "Flynnstoned Cannabis Company",
    "Rochester's Finest",
    "MJ Dispensary",
    "Twisted Cannabis FLX",
    "Native Haze Cannabis Company",
    "Evergreen Retail",
    "Just Breathe Finger Lakes",
    "Three Buds",
    "High Points Dispensary",
    "The Shady Grove Dispensary",
    "Good Life Collective"
  ],
  "Long Island": [
    "Happy Days",
    "Strain Stars",
    "Beleaf Calverton",
    "Strain Stars",
    "Brown Budda New York",
    "Long Island Cannabis Club",
    "PLANET NUGG"
  ],
  "Manhattan": [
    "VERDI",
    "Housing Works Cannabis Co.",
    "Lenox Hill Cannabis Co.",
    "The Herbal Care",
    "Housing Works Cannabis Co.",
    "Cannabis on Lex",
    "Dagmar Cannabis",
    "The Flowery",
    "Charlie Fox",
    "Conbud",
    "Gotham Buds",
    "NY Cannabis Co",
    "ELEVATION HEADQUARTERS",
    "Happy Munkey",
    "Sofaclub",
    "Sweet Life",
    "JUST A LITTLE HIGHER MURRAY HILL",
    "Broadway Strains",
    "Alta Dispensary",
    "Nicklz",
    "Sparkboro",
    "Emerald Dispensary",
    "Gotham Bowery",
    "Just A Little Higher",
    "Elevate Soho Cannabis",
    "Kush Klub",
    "Dazed",
    "QUBE",
    "Alto Canna",
    "The Travel Agency",
    "Midnight Moon",
    "G Spot NYC",
    "Indoor Treez",
    "Canna Dreams",
    "Flower Power Dispensers",
    "SMILEY EXOTICS",
    "Blue Forest Farms Dispensary",
    "Bliss and Lex",
    "Stoops NYC",
    "Chelsea Cannabis Co.",
    "Torches NYC",
    "Liberty Buds",
    "Union Square Travel Agency: A Cannabis Store",
    "Mighty Lucky",
    "Smacked",
    "Culture House NYC",
    "New Amsterdam"
  ],
  "Mid-Hudson": [
    "Orange County Cannabis Co",
    "The Station",
    "Canna Planet",
    "Upstate Pines",
    "Budr Cannabis",
    "Catskill Mountain High",
    "Root 9 Dispensary",
    "Starlife",
    "Woodstock Oasis",
    "Joint Jungle",
    "Royal Blend Dispensary",
    "Nug Yonkers",
    "Statis Cannabis Co",
    "Hemp and Humanity",
    "White Atmoss",
    "Cloud Nine Dispensary",
    "Cloud 914",
    "Valley Greens",
    "Highlife Health",
    "Domes Dispensary",
    "Country Road Cannabis",
    "The purple owl Dispensary",
    "I Heart Jane",
    "Farmers Choice",
    "Canna Planet",
    "Treehouse Cannabis",
    "Purple Plains",
    "BIG GAS DISPENSARY",
    "Leafology Cannabis Company",
    "Budd Barn",
    "Kings House of Fire",
    "Fishkill Cannabis",
    "Platinum Leaf",
    "Grounded",
    "Central Buds",
    "Black Market Canna",
    "Lucky Green Ladies",
    "Fan of the Plant",
    "Cannabis Realm of New York"
  ],
  "Mohawk Valley": [
    "Dam Good Cannabis",
    "Luxus Botanica",
    "Dosha Farms",
    "Air City Cannabis",
    "The Village Green Dispensary",
    "Exit 31 Exotic"
  ],
  "North Country": [
    "The Grass Hole Cannabis",
    "Highest Peak NY",
    "THE FIREHAUS NY",
    "Black River Supply Co",
    "The Herb Cave",
    "Elevate ADK",
    "Northern Lights Dispensary",
    "CANNABIS DEPOT",
    "P Nuggs",
    "The Green Door"
  ],
  "Queens": [
    "Urban Weeds",
    "Green Flower Wellness",
    "Terp Bros",
    "Munchies",
    "The Flowery",
    "Vaporize New York",
    "NY ELITE CANNABIS",
    "Flor de Fred",
    "Herbarium Queens",
    "Columbia Care",
    "Polanco Brothers Ridgewood",
    "GREEN FLOWER WELLNESS",
    "House of Strains",
    "Weedside Dispensary",
    "Bayside Cannabis",
    "The THC Shop",
    "Good Grades",
    "Trends Dispensaries LLC",
    "The Cannabis Place",
    "Late Bloomers",
    "Silk Road NYC",
    "Aroma Farms",
    "NYC Bud",
    "Weed Mart By New Metro",
    "Cannavita",
    "NYC Cannabis Exchange"
  ],
  "Richmond": [
    "The Flowery",
    "Highstone",
    "Nug Hub",
    "Clouditude Dispensary",
    "Zen Zest",
    "The WEED Shoppe"
  ],
  "Southern Tier": [
    "Hazy Daze",
    "The Highly Connected Dispensary",
    "Sacred Bloom",
    "Greenery Spot",
    "Greens Greenery",
    "Collegetown Dispensary",
    "Aspire",
    "WilliamJane",
    "Dryden Dispensary",
    "Just Breathe",
    "Cotton Mouth Dispensary"
  ],
  "Western NY": [
    "716 Cannabis",
    "Premier Earth",
    "Happy Leaf Cannabis Co",
    "Starbuds",
    "The Cannabis Store",
    "The Phinest Buds",
    "Command Cannabis Dispensary",
    "Herbal I.Q.",
    "Lifted",
    "Kokoro Way",
    "Bob Natural",
    "Dank716",
    "High Tide",
    "Secret Garden 716",
    "Mammoth Cannabis",
    "GP 716",
    "82J Dispensary",
    "Upstate Exotics",
    "Happy Times Cannabis Co.",
    "Yeti Canna",
    "Peace, Love, & Bud",
    "MARY JANES- A LEGACY 2 LEGAL DISPENSARY",
    "Ether",
    "East Leaf Dispensary",
    "Devil's Lettuce",
    "Treehead Culture",
    "WeedNDeed",
    "Public Flower",
    "Honey Kenmore"
  ]
};

async function populateStores() {
  try {
    console.log("Starting store population process...");
    
    // Iterate through each region and its stores
    for (const [region, stores] of Object.entries(storesByRegion)) {
      console.log(`Processing region: ${region}`);
      
      // Format stores with active status
      const storeObjects = stores.map(storeName => ({
        name: storeName,
        active: true
      }));
      
      // Set the region document with stores
      await db.collection('companies')
        .doc(COMPANY_ID)  // Using the correct company ID
        .collection('regions')
        .doc(region)
        .set({
          stores: storeObjects
        });
      
      console.log(`✓ Added ${stores.length} stores to ${region}`);
    }
    
    console.log("Successfully populated all stores!");
    
  } catch (error) {
    console.error("Error populating stores:", error);
    throw error;
  }
}

// Run the population script
console.log("Starting store population...");
populateStores()
  .then(() => {
    console.log("Successfully populated all stores!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 