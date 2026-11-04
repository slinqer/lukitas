import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("privacy", "it");
export const links = () => pageLinksFor("privacy", "it");

/** Placeholder until the legal page body lands. */
export default function PrivacyIt() {
  return <h1>{(pageMeta("privacy", "it")[0] as { title: string }).title}</h1>;
}
