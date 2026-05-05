import { type Request, type Response, type NextFunction } from 'express';
import { hasFirebaseAdmin } from '../env';
import { firebaseAdmin } from '../firebase';

export interface AuthedRequest extends Request {
  parentUid?: string;
}

/**
 * Verifies the Firebase ID token in the `Authorization: Bearer <token>` header.
 * On success, attaches `req.parentUid`. Otherwise responds 401.
 */
export const requireParent = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  if (!hasFirebaseAdmin()) {
    return res.status(503).json({ error: 'firebase_admin_not_configured' });
  }
  const auth = req.header('authorization') ?? req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_bearer_token' });
  }
  const idToken = auth.slice('Bearer '.length).trim();
  if (!idToken) return res.status(401).json({ error: 'empty_bearer_token' });
  try {
    const decoded = await firebaseAdmin().auth().verifyIdToken(idToken);
    req.parentUid = decoded.uid;
    return next();
  } catch (e) {
    return res
      .status(401)
      .json({ error: e instanceof Error ? e.message : 'invalid_token' });
  }
};

/**
 * Verifies that the authenticated parent (set by requireParent) actually owns
 * the given childId by reading the top-level `children/{childId}` document
 * and checking its `parentUid` field.
 */
export const assertOwnsChild = async (
  parentUid: string,
  childId: string,
): Promise<boolean> => {
  const db = firebaseAdmin().firestore();
  const snap = await db.doc(`children/${childId}`).get();
  if (!snap.exists) return false;
  const data = snap.data() as { parentUid?: string } | undefined;
  return data?.parentUid === parentUid;
};
