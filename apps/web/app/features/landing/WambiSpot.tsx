import type { WambiMood } from "../../wambi/mood.ts";
import type { WambiPose } from "../../wambi/use-scroll-pose.ts";

/**
 * Where the traveling Wambi stands for a section (see `useScrollPose` and `TravelingWambi`): an
 * empty, decorative box in free space beside the section's heading, sized per viewport by
 * landing.css. He shows `mood` here (`data-wambi-mood`). Without him (no JavaScript, reduced
 * motion) it is just empty space.
 */
export function WambiSpot({ id, pose, mood }: { id: string; pose: WambiPose; mood: WambiMood }) {
  return (
    <span
      className={`lk-landing-spot is-${id}`}
      data-wambi-spot={id}
      data-wambi-pose={pose}
      data-wambi-mood={mood}
      aria-hidden="true"
    />
  );
}
