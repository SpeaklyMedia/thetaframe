export const THETAFRAME_OPEN_GUIDE_EVENT = "thetaframe:open-guide";

export function openThetaFrameGuide() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THETAFRAME_OPEN_GUIDE_EVENT));
}
