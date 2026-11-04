import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("deleteAccount", "pt");
export const links = () => pageLinksFor("deleteAccount", "pt");

/** `/pt/delete-account`: how to delete an account, in Portuguese, prerendered. */
export default function DeleteAccountPt() {
  return <LegalPage page="deleteAccount" />;
}
