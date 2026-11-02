import { useTranslations } from "use-intl";
import { Wambi } from "../../wambi/Wambi.tsx";

/**
 * The hero's Wambi: the 2D waving sprite, which waves once and then rests on his first frame (the
 * landing's mascot is calm; everywhere else he keeps looping), filling a square box that the stylesheet sizes per
 * viewport. It is also the first Wambi spot: once the traveling Wambi is live (see `Landing`), he
 * stands here (waving once, too) and the sprite steps aside; the sprite stays under reduced motion and without
 * JavaScript (it is the prerendered content). Once per session the traveling Wambi rolls in from
 * `data-wambi-enter-from` (the side away from the text). The box carries the accessible name, so
 * whatever renders inside stays decorative.
 */
export function HeroMascot() {
  const t = useTranslations("landing.hero");
  return (
    <div
      className="lk-landing-mascot"
      data-slot="hero-mascot"
      data-wambi-spot="hero"
      data-wambi-pose="wave"
      data-wambi-mood="happy"
      // Opposite the headline on desktop, and from the right on phones: he never rolls over text.
      data-wambi-enter-from="right"
      role="img"
      aria-label={t("mascot")}
    >
      <Wambi mood="happy" size="100%" decorative playOnce />
    </div>
  );
}
