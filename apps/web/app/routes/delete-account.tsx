import { pageLinksFor, pageMeta } from "../features/landing/seo.ts";

export const meta = () => pageMeta("deleteAccount", "es");
export const links = () => pageLinksFor("deleteAccount", "es");

/** Placeholder until the legal page body lands. */
export default function DeleteAccountEs() {
  return <h1>{(pageMeta("deleteAccount", "es")[0] as { title: string }).title}</h1>;
}
