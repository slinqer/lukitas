import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("privacy", "pt");
export const links = () => pageLinksFor("privacy", "pt");

/** `/pt/privacy`: the privacy policy, in Portuguese, prerendered. */
export default function PrivacyPt() {
  return <LegalPage page="privacy" />;
}
