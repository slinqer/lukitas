import { CapturePage } from "../features/capture/CapturePage.tsx";
import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("automaticCapture", "it");
export const links = () => pageLinksFor("automaticCapture", "it");

/** `/it/automatic-capture`: how automatic capture works, in Italian, prerendered. */
export default function AutomaticCaptureIt() {
  return <CapturePage />;
}
