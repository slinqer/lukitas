import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("privacy", "es");
export const links = () => pageLinksFor("privacy", "es");

/** Placeholder until the legal page body lands. */
export default function PrivacyEs() {
  return <h1>{(pageMeta("privacy", "es")[0] as { title: string }).title}</h1>;
}
