import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("deleteAccount", "it");
export const links = () => pageLinksFor("deleteAccount", "it");

/** `/it/delete-account`: how to delete an account, in Italian, prerendered. */
export default function DeleteAccountIt() {
  return <LegalPage page="deleteAccount" />;
}
