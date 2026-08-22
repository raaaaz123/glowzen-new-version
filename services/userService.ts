import { currentUid, signOut } from "@/lib/firebase/auth";
import { paths, readDoc, removeCollection, removeDoc, writeDoc } from "@/lib/firebase/firestore";
import { deletePhotos } from "@/lib/storage/photos";
import type { Gender, QuestionnaireAnswers, UserProfile } from "@/lib/types";

/** Stored shape of the web app's user document. */
export interface UserDoc {
  answers: Partial<QuestionnaireAnswers>;
  savedStyleId: string | null;
  /** R2 object key. The signed URL is resolved fresh — it expires. */
  photoKey: string | null;
}

const EMPTY_DOC: UserDoc = {
  answers: {},
  savedStyleId: null,
  photoKey: null,
};

export async function getUserDoc(): Promise<UserDoc> {
  const uid = await currentUid();
  return readDoc<UserDoc>(paths.user(uid), EMPTY_DOC);
}

/** Only what the user actually told us. Nothing is filled in for them. */
export async function getProfile(gender: Gender | null): Promise<UserProfile> {
  const stored = await getUserDoc();
  return {
    gender: gender ?? stored.answers.gender ?? null,
    ageRange: stored.answers.ageRange ?? null,
    aesthetic: stored.answers.aesthetic ?? null,
    goal: stored.answers.priority ?? null,
    concern: stored.answers.concern ?? null,
    photoKey: stored.photoKey,
  };
}

export async function saveAnswers(
  answers: QuestionnaireAnswers,
): Promise<QuestionnaireAnswers> {
  const uid = await currentUid();
  await writeDoc(paths.user(uid), { answers });
  return answers;
}

export async function saveSavedStyle(styleId: string | null): Promise<void> {
  const uid = await currentUid();
  await writeDoc(paths.user(uid), { savedStyleId: styleId });
}

export async function savePhotoKey(key: string | null): Promise<void> {
  const uid = await currentUid();
  await writeDoc(paths.user(uid), { photoKey: key });
}

export async function deleteAllPhotos(): Promise<void> {
  const uid = await currentUid();
  await deletePhotos();
  await writeDoc(paths.user(uid), { photoKey: null });
}

export async function deleteAccount(): Promise<void> {
  const uid = await currentUid();
  await deletePhotos();
  await removeCollection(paths.analyses(uid));
  await removeDoc(paths.plan(uid));
  await removeDoc(paths.progress(uid));
  await removeDoc(paths.user(uid));
  await signOut();
}
