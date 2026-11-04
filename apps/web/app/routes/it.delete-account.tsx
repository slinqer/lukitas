import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("deleteAccount", "it");
export const links = () => pageLinksFor("deleteAccount", "it");

/** Placeholder until the legal page body lands. */
export default function DeleteAccountIt() {
  return <h1>{(pageMeta("deleteAccount", "it")[0] as { title: string }).title}</h1>;
}
