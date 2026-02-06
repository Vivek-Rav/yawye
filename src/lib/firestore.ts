import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import type { ScanResult } from "@/lib/gemini";

export interface StoredScan extends ScanResult {
  id: string;
  userId: string;
  context: string;
  createdAt: Date;
}

export async function saveScan(
  scanResult: ScanResult,
  userId: string,
  context: string
): Promise<string> {
  const docRef = await addDoc(collection(getFirebaseDB(), "scans"), {
    ...scanResult,
    userId,
    context,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserScans(userId: string): Promise<StoredScan[]> {
  const q = query(
    collection(getFirebaseDB(), "scans"),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);

  const scans: StoredScan[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      context: data.context || "",
      foodName: data.foodName,
      calories: data.calories,
      ingredients: data.ingredients,
      riskLevel: data.riskLevel,
      riskReason: data.riskReason,
      humorComment: data.humorComment,
      brandNote: data.brandNote ?? null,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    } as StoredScan;
  });

  // Sort newest-first client-side (avoids needing a composite index)
  scans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return scans;
}

export async function clearUserScans(userId: string): Promise<void> {
  const q = query(
    collection(getFirebaseDB(), "scans"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
}
