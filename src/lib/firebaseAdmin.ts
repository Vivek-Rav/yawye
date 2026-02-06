import admin from "firebase-admin";

let _app: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  // Reuse existing app if firebase-admin already initialized (survives HMR in dev)
  if (admin.apps.length > 0) return admin.apps[0]!;
  _app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n"
      ),
    }),
  });
  return _app;
}

// Returns uid + email if the token is valid, null otherwise.
export async function verifyToken(
  token: string
): Promise<{ uid: string; email: string } | null> {
  try {
    const decoded = await admin.auth(getAdminApp()).verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}

// Count how many scans a user has saved today (server-side via Admin SDK).
export async function getDailyScanCountAdmin(uid: string): Promise<number> {
  const db = admin.firestore(getAdminApp());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const snapshot = await db
    .collection("scans")
    .where("userId", "==", uid)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startOfToday))
    .get();
  return snapshot.size;
}
