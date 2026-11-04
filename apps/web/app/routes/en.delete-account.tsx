import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("deleteAccount", "en");
export const links = () => pageLinksFor("deleteAccount", "en");

/** `/en/delete-account`: how to delete an account, in English, prerendered. */
export default function DeleteAccountEn() {
  return <LegalPage page="deleteAccount" />;
}
