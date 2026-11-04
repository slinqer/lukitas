import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("privacy", "pt");
export const links = () => pageLinksFor("privacy", "pt");

/** Placeholder until the legal page body lands. */
export default function PrivacyPt() {
  return <h1>{(pageMeta("privacy", "pt")[0] as { title: string }).title}</h1>;
}
