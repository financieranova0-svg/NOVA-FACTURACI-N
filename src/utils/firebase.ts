import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  Firestore
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize the Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with local persistence enabled (works perfectly offline!)
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId || "(default)");

/**
 * Saves user data directly to Firestore.
 * Because Firestore persistence is enabled, this write is queued locally if offline
 * and automatically synced to the cloud as soon as we regain internet access.
 */
export async function saveUserDataToFirestore(
  email: string,
  data: {
    products: any[];
    clients: any[];
    sales: any[];
    ncfCount: any;
    closures: any[];
    receipts: any[];
    version: number;
  }
) {
  if (!email) return;
  const cleanEmail = email.toLowerCase().trim();
  const userDocRef = doc(db, "users_data", cleanEmail);
  
  try {
    await setDoc(userDocRef, {
      ...data,
      email: cleanEmail,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Firestore offline/online write failed:", error);
    // Even if it fails (e.g. permission or rare sync error), the Firestore SDK 
    // will still retry in the background if it's transient.
  }
}

/**
 * Sets up a real-time Firestore listener for the user's document.
 * This runs offline & online:
 * - If offline, it serves cached data from IndexedDB immediately.
 * - If online, it listens to remote changes and fetches new data if a higher version is found.
 */
export function listenUserDataFromFirestore(
  email: string,
  onUpdate: (data: any, fromCache: boolean) => void,
  onError?: (err: any) => void
) {
  if (!email) return () => {};
  const cleanEmail = email.toLowerCase().trim();
  const userDocRef = doc(db, "users_data", cleanEmail);

  const unsubscribe = onSnapshot(
    userDocRef,
    (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const fromCache = snapshot.metadata.fromCache;
        onUpdate(data, fromCache);
      } else {
        // Doc doesn't exist yet in cloud or local cache
        onUpdate(null, snapshot.metadata.fromCache);
      }
    },
    (error) => {
      console.error("Firestore onSnapshot subscription error:", error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Does a one-time get of user data from Firestore cache/server (for initialization if needed).
 */
export async function getUserDataFromFirestoreOnce(email: string) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const userDocRef = doc(db, "users_data", cleanEmail);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Error fetching single document from Firestore:", err);
  }
  return null;
}

/**
 * Does a one-time get of license from Firestore.
 */
export async function getLicenseFromFirestoreOnce(email: string) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const docRef = doc(db, "licenses", cleanEmail);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Error fetching single license from Firestore:", err);
  }
  return null;
}

/**
 * Saves or updates a license status directly in Firestore 'licenses' collection
 */
export async function saveLicenseToFirestore(license: any) {
  if (!license || !license.email) return;
  const cleanEmail = license.email.toLowerCase().trim();
  const licenseDocRef = doc(db, "licenses", cleanEmail);
  try {
    await setDoc(licenseDocRef, {
      ...license,
      email: cleanEmail,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving license to Firestore:", error);
  }
}

/**
 * Listens to all global licenses in real-time
 */
export function listenGlobalLicensesFromFirestore(onUpdate: (data: any[]) => void) {
  const colRef = collection(db, "licenses");
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot: any) => {
      const list: any[] = [];
      snapshot.forEach((docSnap: any) => {
        list.push({ ...docSnap.data() });
      });
      onUpdate(list);
    },
    (error) => {
      console.error("Firestore listenGlobalLicenses error:", error);
    }
  );
  return unsubscribe;
}

/**
 * Listens to a single user's license in real-time.
 * Perfect for reactive notifications and real-time suspension/blocking!
 */
export function listenMyLicenseFromFirestore(email: string, onUpdate: (data: any) => void) {
  if (!email) return () => {};
  const cleanEmail = email.toLowerCase().trim();
  const licenseDocRef = doc(db, "licenses", cleanEmail);
  const unsubscribe = onSnapshot(
    licenseDocRef,
    (snapshot: any) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error("Firestore listenMyLicense error:", error);
    }
  );
  return unsubscribe;
}
