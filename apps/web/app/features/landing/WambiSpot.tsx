import { poseMood } from "../../wambi/traveling.ts";
import type { WambiPose } from "../../wambi/use-scroll-pose.ts";
import { LANDING_ART, stillArt, Wambi } from "../../wambi/Wambi.tsx";

/**
 * Where the traveling Wambi stands for a section (see `useScrollPose` and `TravelingWambi`): a
 * decorative box in free space beside the section's heading, sized per viewport by landing.css.
 * He takes `pose` here (`data-wambi-pose`) and plays its gesture once on arriving. Without him (no
 * JavaScript, reduced motion, or before he is live) the box shows that pose's still frame: pointing
 * is the still image, thinking its frame with three dots. It steps aside once he is live.
 */
export function WambiSpot({ id, pose }: { id: string; pose: WambiPose }) {
  return (
    <span
      className={`lk-landing-spot is-${id}`}
      data-wambi-spot={id}
      data-wambi-pose={pose}
      aria-hidden="true"
    >
      <Wambi
        mood={poseMood(pose)}
        size="100%"
        decorative
        deferUntilNear
        art={stillArt(LANDING_ART[pose])}
      />
    </span>
  );
}
