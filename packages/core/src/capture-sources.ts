export const CAPTURE_SOURCES = ["revolut", "google_wallet"] as const;
export type CaptureSource = (typeof CAPTURE_SOURCES)[number];
