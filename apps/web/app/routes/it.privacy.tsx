import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("privacy", "it");
export const links = () => pageLinksFor("privacy", "it");

/** `/it/privacy`: the privacy policy, in Italian, prerendered. */
export default function PrivacyIt() {
  return <LegalPage page="privacy" />;
}
