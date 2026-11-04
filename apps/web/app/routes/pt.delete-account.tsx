import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("deleteAccount", "pt");
export const links = () => pageLinksFor("deleteAccount", "pt");

/** Placeholder until the legal page body lands. */
export default function DeleteAccountPt() {
  return <h1>{(pageMeta("deleteAccount", "pt")[0] as { title: string }).title}</h1>;
}
