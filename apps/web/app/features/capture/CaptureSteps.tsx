import { useTranslations } from "use-intl";
import { ChipsDemo, LearnDemo, MainPicture, NoticeDemo } from "./CaptureDemos.tsx";
import "./capture.css";

export const CAPTURE_STEPS = ["pay", "reads", "decide", "learns", "next"] as const;
export type CaptureStep = (typeof CAPTURE_STEPS)[number];

/** One step: its scene (decoration), title, body and, for most, an illustration of it. */
export function CaptureStepView({ step }: { step: CaptureStep }) {
  const t = useTranslations("landing.capture.steps");
  const n = CAPTURE_STEPS.indexOf(step) + 1;
  return (
    <div className="lk-capture-step">
      <img
        className="lk-capture-scene"
        src={`/wambi/capture-step${n}.webp`}
        alt=""
        aria-hidden="true"
        width={200}
        height={200}
        loading="lazy"
      />
      <h2>{t(`${step}.title`)}</h2>
      <p>{t(`${step}.body`)}</p>
      {step === "pay" ? <MainPicture /> : null}
      {step === "reads" ? <ChipsDemo /> : null}
      {step === "decide" ? <NoticeDemo /> : null}
      {step === "learns" ? <LearnDemo /> : null}
    </div>
  );
}

/** The five steps, in order. */
export function CaptureSteps() {
  return (
    <ol className="lk-capture-steps">
      {CAPTURE_STEPS.map((step) => (
        <li key={step} className="lk-landing-card">
          <CaptureStepView step={step} />
        </li>
      ))}
    </ol>
  );
}
