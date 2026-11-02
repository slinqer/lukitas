import { useCallback, useEffect, useRef, useState } from "react";
import { sessionArea } from "../lib/stored.ts";
import { cx } from "../ui/cx.ts";
import { markEntranceSeen, shouldPlayEntrance } from "./entrance.ts";
import { COIN, entranceFrame, poseMood, spotPose, tiltToward, travelFrame } from "./traveling.ts";
import { useScrollPose, type WambiPose, type WambiSpot } from "./use-scroll-pose.ts";
import { LANDING_ART, Wambi, type WambiMoodArt } from "./Wambi.tsx";
import "./traveling-wambi.css";

/** The entrance's still frame: the first frame of the wave sheet, not playing. */
const TUCKED_ART: WambiMoodArt = { ...LANDING_ART.wave, play: false, frame: 0 };
/** Pose layers, in a fixed order so React keeps each one's node (and its loaded sheet). */
const POSE_ORDER: readonly WambiPose[] = ["wave", "point", "think", "celebrate"];
/** The attribute on `<html>` that makes the prerendered Wambi in the spots step aside. */
const LIVE_ATTRIBUTE = "data-wambi-live";

type EntranceState = "playing" | "skipped" | "done";

function poseOf(spot: HTMLElement | null | undefined): WambiPose {
  return spotPose(spot?.dataset.wambiPose);
}

/** The first spot (the hero) says where he rolls in from (`data-wambi-enter-from`, default right). */
function entranceSide(): 1 | -1 {
  return firstSpot()?.dataset.wambiEnterFrom === "left" ? -1 : 1;
}

function initialEntrance(): EntranceState {
  const hero = firstSpot();
  if (!hero) return "skipped";
  const box = hero.getBoundingClientRect();
  const heroInView = box.bottom > box.height * 0.25 && box.top < window.innerHeight;
  return shouldPlayEntrance(sessionArea(), heroInView) ? "playing" : "skipped";
}

/** The clip that tucks his arms and legs away: a circle around the coin, grown by `reveal`. */
function tuckClip(reveal: number): string {
  if (reveal >= 1) return "";
  const radius = COIN.radius * 100 + (80 - COIN.radius * 100) * Math.max(0, reveal);
  return `circle(${radius.toFixed(2)}% at ${COIN.x * 100}% ${COIN.y * 100}%)`;
}

/**
 * Wambi living on the landing page, in 2.5D: the founder's sprite sheets with CSS depth on top.
 * One sprite in an overlay (absolutely positioned in the page, `aria-hidden`, out of the layout)
 * that stands on the page's Wambi spots (`[data-wambi-spot]`, see `useScrollPose`), in each
 * spot's pose (`data-wambi-pose`, art in `LANDING_ART`; poses cross-fade). Between spots
 * he turns edge-on like a coin and fades out, then turns back in on the next spot: he never
 * crosses the page, so he never covers text (`travelFrame`).
 *
 * Depth: a soft ground shadow that shrinks as he rises, an idle bob, a hop with squash and
 * stretch on hover or tap (only his body takes the pointer), and, with a fine pointer, a tilt of
 * up to ±12° toward it. Once per session, with the hero in view, he rolls in from the side away
 * from the text, settles, unfolds and waves (`entranceFrame`). On every arrival at a spot its
 * gesture plays once (the pose's layer remounts) and then he rests: he waves, points (one nudge),
 * thinks (the dots rise once, then three stay) and celebrates; nothing loops.
 *
 * Client-only, and mounted after the page's spots are in the DOM: the landing mounts him once the
 * page has loaded and is idle, and only without reduced motion. The prerendered Wambi in the spots
 * steps aside while he is live.
 */
export function TravelingWambi() {
  const layer = useRef<HTMLDivElement>(null);
  const turn = useRef<HTMLDivElement>(null);
  const roller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<WambiPose>(() => poseOf(firstSpot()));
  const [mounted, setMounted] = useState<ReadonlySet<WambiPose>>(() => new Set([pose]));
  const [spotId, setSpotId] = useState(() => firstSpot()?.dataset.wambiSpot ?? "");
  const [entrance, setEntrance] = useState<EntranceState>(initialEntrance);
  const [tucked, setTucked] = useState(entrance === "playing");
  const [hopping, setHopping] = useState(false);
  // Counts his arrivals at spots; it keys the shown pose's layer, so each arrival plays it once anew.
  const [arrivals, setArrivals] = useState(0);
  const lastSpot = useRef(firstSpot()?.dataset.wambiSpot ?? "");
  const moving = useRef(false);
  const size = useRef(0);
  // The pose his spot asks for. He switches to it only once its sheet has loaded, and keeps the
  // pose he shows meanwhile; if the sheet of the pose he shows fails, he steps aside (`broken`)
  // and the prerendered sprites come back. So a spot never stays empty.
  const wanted = useRef(pose);
  const shown = useRef(pose);
  shown.current = pose;
  const sheets = useRef({
    ready: new Set<WambiPose>(),
    loading: new Set<WambiPose>(),
    failed: new Set<WambiPose>(),
  });
  const [broken, setBroken] = useState(false);

  /**
   * Loads a pose's sheet once; then mounts its layer and, if his spot wants it, shows it. A sheet
   * that failed isn't tried again until his spot asks for it anew (`retry`).
   */
  const load = useCallback((m: WambiPose, retry = false) => {
    const { ready, loading, failed } = sheets.current;
    if (retry) failed.delete(m);
    if (ready.has(m) || loading.has(m) || failed.has(m)) return;
    loading.add(m);
    const image = new Image();
    image.src = LANDING_ART[m].sprite.src;
    image.decode().then(
      () => {
        loading.delete(m);
        ready.add(m);
        setMounted((previous) => (previous.has(m) ? previous : new Set([...previous, m])));
        if (wanted.current === m) setPose(m);
      },
      () => {
        loading.delete(m);
        failed.add(m);
        // Nothing to hold on to: the pose he shows has no sheet.
        if (shown.current === m) setBroken(true);
      },
    );
  }, []);

  const place = useCallback(
    ({ spots, index, y }: { spots: WambiSpot[]; index: number; y: number }) => {
      const element = layer.current;
      const parent = element?.offsetParent;
      const current = spots[index];
      if (!element || !parent || !current) return;
      const base = parent.getBoundingClientRect();
      const boxOf = (spot: WambiSpot) => {
        const b = spot.element.getBoundingClientRect();
        return {
          x: b.left - base.left + b.width / 2,
          y: b.top - base.top + b.height / 2,
          size: Math.min(b.width, b.height),
        };
      };
      // One layer, sized for the biggest spot and scaled down on the others: no relayout.
      const layerSize = Math.max(...spots.map((spot) => boxOf(spot).size));
      if (layerSize !== size.current) {
        size.current = layerSize;
        element.style.width = `${layerSize}px`;
        element.style.height = `${layerSize}px`;
      }
      const next = spots[index + 1];
      const frame = travelFrame(y, next !== undefined);
      const spot = frame.at === "next" && next ? next : current;
      const box = boxOf(spot);
      element.style.transform = `translate3d(${box.x - layerSize / 2}px, ${box.y - layerSize / 2}px, 0) scale(${box.size / layerSize})`;
      if (turn.current) {
        turn.current.style.opacity = frame.opacity === 1 ? "" : frame.opacity.toFixed(3);
        turn.current.style.transform =
          frame.turn === 0 ? "" : `rotateY(${frame.turn.toFixed(2)}deg)`;
      }
      if (moving.current !== frame.moving) {
        moving.current = frame.moving;
        element.toggleAttribute("data-moving", frame.moving);
      }
      setSpotId(spot.id);
      const target = poseOf(spot.element);
      if (lastSpot.current !== spot.id) {
        lastSpot.current = spot.id;
        setArrivals((n) => n + 1);
      }
      // Arriving at a spot (a new target) retries its sheet if it failed before.
      const arriving = wanted.current !== target;
      wanted.current = target;
      load(target, arriving);
      // Until the spot's sheet has loaded (an anchor jump on a slow link), he keeps his pose.
      if (sheets.current.ready.has(target)) setPose(target);
    },
    [load],
  );
  useScrollPose(place);

  // Every spot's sheet starts loading as soon as he is live (the page has loaded and is idle), so
  // a jump straight to a section (the header's "how it works" link) finds it ready or in flight.
  useEffect(() => {
    for (const spot of document.querySelectorAll<HTMLElement>("[data-wambi-spot]")) {
      load(poseOf(spot));
    }
  }, [load]);

  // He is live: the prerendered Wambi in the spots steps aside (and comes back when he unmounts or
  // steps aside himself).
  useEffect(() => {
    if (broken) return;
    const frame = requestAnimationFrame(() =>
      document.documentElement.setAttribute(LIVE_ATTRIBUTE, "live"),
    );
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.removeAttribute(LIVE_ATTRIBUTE);
    };
  }, [broken]);

  // The entrance: roll in, settle, unfold, wave; driven per frame from the pure `entranceFrame`.
  useEffect(() => {
    if (entrance !== "playing") return;
    markEntranceSeen(sessionArea());
    const from = entranceSide();
    let start = 0;
    let frame = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const f = entranceFrame(now - start, size.current, from);
      const element = roller.current;
      const coin = body.current;
      if (element && coin) {
        element.style.transform = f.x === 0 ? "" : `translateX(${f.x.toFixed(1)}px)`;
        const drop = f.drop * size.current;
        coin.style.transform =
          f.reveal >= 1 && f.scale === 1
            ? ""
            : `translateY(${drop.toFixed(1)}px) rotate(${f.rotate.toFixed(2)}deg) scale(${f.scale.toFixed(3)})`;
        coin.style.clipPath = tuckClip(f.reveal);
      }
      if (!f.still) setTucked(false);
      if (f.phase === "done") {
        setEntrance("done");
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [entrance]);

  // With a fine pointer (desktop), he turns toward it, up to ±12°.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const apply = () => {
      frame = 0;
      const element = tilt.current;
      const box = layer.current?.getBoundingClientRect();
      if (!element || !box) return;
      if (!pointer || !fine.matches) {
        element.style.transform = "";
        return;
      }
      const { rotateX, rotateY } = tiltToward(
        pointer,
        { x: box.left + box.width / 2, y: box.top + box.height * 0.45 },
        { width: window.innerWidth, height: window.innerHeight },
      );
      element.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      pointer = null;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const hop = () => {
    if (moving.current || entrance === "playing" || hopping) return;
    setHopping(true);
  };

  if (broken) return null;

  return (
    <div
      ref={layer}
      className="lk-traveler"
      data-wambi-traveler=""
      data-spot={spotId}
      data-pose={pose}
      data-entrance={entrance}
      aria-hidden="true"
    >
      <div ref={turn} className="lk-traveler-turn">
        <div ref={roller} className="lk-traveler-roller">
          <div className={cx("lk-traveler-shadow", hopping && "is-hopping")} />
          <div ref={tilt} className="lk-traveler-tilt">
            <div className="lk-traveler-bob">
              <div
                className={cx("lk-traveler-hop", hopping && "is-hopping")}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) setHopping(false);
                }}
              >
                <div ref={body} className="lk-traveler-body">
                  {POSE_ORDER.filter((p) => mounted.has(p)).map((p) => (
                    <div
                      key={p}
                      className={cx("lk-traveler-mood", p === pose && "is-active")}
                      data-pose={p}
                    >
                      <Wambi
                        key={p === pose ? arrivals : "resting"}
                        mood={poseMood(p)}
                        size="100%"
                        decorative
                        art={p === "wave" && tucked ? TUCKED_ART : LANDING_ART[p]}
                        playOnce
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className="lk-traveler-hit"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") hop();
            }}
            onPointerDown={hop}
          />
        </div>
      </div>
    </div>
  );
}

/** The first spot in page order (the hero): where he starts, before the first scroll update. */
function firstSpot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-wambi-spot]");
}
