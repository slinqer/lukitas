import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("privacy", "en");
export const links = () => pageLinksFor("privacy", "en");

/** Placeholder until the legal page body lands. */
export default function PrivacyEn() {
  return <h1>{(pageMeta("privacy", "en")[0] as { title: string }).title}</h1>;
}
