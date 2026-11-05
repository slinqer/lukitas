import { CapturePage } from "../features/capture/CapturePage.tsx";
import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("automaticCapture", "es");
export const links = () => pageLinksFor("automaticCapture", "es");

/** `/automatic-capture`: how automatic capture works, in Spanish, prerendered. */
export default function AutomaticCaptureEs() {
  return <CapturePage />;
}
