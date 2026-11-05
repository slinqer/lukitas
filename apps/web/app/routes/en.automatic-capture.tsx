import { CapturePage } from "../features/capture/CapturePage.tsx";
import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("automaticCapture", "en");
export const links = () => pageLinksFor("automaticCapture", "en");

/** `/en/automatic-capture`: how automatic capture works, in English, prerendered. */
export default function AutomaticCaptureEn() {
  return <CapturePage />;
}
