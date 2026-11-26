export const cookieSettingsEvent = "renzo:cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(cookieSettingsEvent));
}
