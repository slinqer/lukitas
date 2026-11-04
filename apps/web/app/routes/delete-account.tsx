import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("deleteAccount", "es");
export const links = () => pageLinksFor("deleteAccount", "es");

/** `/delete-account`: how to delete an account, in Spanish, prerendered. */
export default function DeleteAccountEs() {
  return <LegalPage page="deleteAccount" />;
}
