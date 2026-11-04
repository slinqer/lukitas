import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("deleteAccount", "en");
export const links = () => pageLinksFor("deleteAccount", "en");

/** Placeholder until the legal page body lands. */
export default function DeleteAccountEn() {
  return <h1>{(pageMeta("deleteAccount", "en")[0] as { title: string }).title}</h1>;
}
