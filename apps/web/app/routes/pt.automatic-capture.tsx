import { CapturePage } from "../features/capture/CapturePage.tsx";
import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("automaticCapture", "pt");
export const links = () => pageLinksFor("automaticCapture", "pt");

/** `/pt/automatic-capture`: how automatic capture works, in Portuguese, prerendered. */
export default function AutomaticCapturePt() {
  return <CapturePage />;
}
