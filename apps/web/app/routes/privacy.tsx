import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";
import { LegalPage } from "../features/legal/LegalPage.tsx";

export const meta = () => pageMeta("privacy", "es");
export const links = () => pageLinksFor("privacy", "es");

/** `/privacy`: the privacy policy, in Spanish, prerendered. */
export default function PrivacyEs() {
  return <LegalPage page="privacy" />;
}
