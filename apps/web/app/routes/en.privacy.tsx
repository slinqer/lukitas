import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("privacy", "en");
export const links = () => pageLinksFor("privacy", "en");

/** `/en/privacy`: the privacy policy, in English, prerendered. */
export default function PrivacyEn() {
  return <LegalPage page="privacy" />;
}
