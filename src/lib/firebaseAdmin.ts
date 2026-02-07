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

// Validate an IANA timezone string (e.g. "Asia/Singapore").
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Get the UTC instant corresponding to midnight (start of today) in the given timezone.
function getStartOfDayInTimezone(timezone: string): Date {
  const now = new Date();
  // "en-CA" locale formats as YYYY-MM-DD
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  // Compute the offset between UTC and the target timezone at midnight
  const midnightUTC = new Date(dateStr + "T00:00:00Z");
  const utcStr = midnightUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = midnightUTC.toLocaleString("en-US", { timeZone: timezone });
  const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime();
  return new Date(midnightUTC.getTime() + offsetMs);
}

// Count how many scans a user has saved today (server-side via Admin SDK).
// Uses the client's timezone so the daily limit resets at the user's local midnight.
export async function getDailyScanCountAdmin(
  uid: string,
  timezone: string = "UTC"
): Promise<number> {
  const db = admin.firestore(getAdminApp());
  const startOfToday = getStartOfDayInTimezone(timezone);
  const snapshot = await db
    .collection("scans")
    .where("userId", "==", uid)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startOfToday))
    .get();
  return snapshot.size;
}
