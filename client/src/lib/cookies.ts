import { CookiePreferences, CookieSettings } from "@shared/schema.ts";

export const COOKIE_NAMES = {
  CONSENT: 'cookie_consent',
  PREFERENCES: 'cookie_preferences',
  SETTINGS: 'user_settings',
  SIDEBAR: 'sidebar_state',
  THEME: 'theme',
} as const;

export const COOKIE_EXPIRES = {
  CONSENT: 365, // 1 year
  PREFERENCES: 365, // 1 year  
  SETTINGS: 365, // 1 year
  SESSION: 7, // 1 week
} as const;

export function setCookie(name: string, value: string, days: number = 365): void {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
}

export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }
  return null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

export function deleteAllNonEssentialCookies(): void {
  const cookies = document.cookie.split(';');
  const essentialCookies = [
    COOKIE_NAMES.CONSENT,
    COOKIE_NAMES.PREFERENCES,
    'connect.sid',
  ];
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    if (!essentialCookies.includes(name)) {
      deleteCookie(name);
    }
  }
}

export function getCookiePreferences(): CookiePreferences {
  const storedPrefs = getCookie(COOKIE_NAMES.PREFERENCES);
  
  if (storedPrefs) {
    try {
      return JSON.parse(decodeURIComponent(storedPrefs));
    } catch {
      return getDefaultCookiePreferences();
    }
  }
  
  return getDefaultCookiePreferences();
}

export function setCookiePreferences(preferences: CookiePreferences): void {
  const prefsString = encodeURIComponent(JSON.stringify(preferences));
  setCookie(COOKIE_NAMES.PREFERENCES, prefsString, COOKIE_EXPIRES.PREFERENCES);
}

export function getDefaultCookiePreferences(): CookiePreferences {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
    consentGiven: false,
  };
}

export function hasGivenConsent(): boolean {
  const consent = getCookie(COOKIE_NAMES.CONSENT);
  return consent === 'true';
}

export function setConsent(given: boolean): void {
  setCookie(COOKIE_NAMES.CONSENT, given.toString(), COOKIE_EXPIRES.CONSENT);
  
  if (given) {
    const preferences = getCookiePreferences();
    preferences.consentGiven = true;
    preferences.consentDate = new Date().toISOString();
    setCookiePreferences(preferences);
  }
}

export function getCookieSettings(): CookieSettings {
  const storedSettings = getCookie(COOKIE_NAMES.SETTINGS);
  
  if (storedSettings) {
    try {
      return JSON.parse(decodeURIComponent(storedSettings));
    } catch {
      return getDefaultCookieSettings();
    }
  }
  
  return getDefaultCookieSettings();
}

export function setCookieSettings(settings: CookieSettings): void {
  const settingsString = encodeURIComponent(JSON.stringify(settings));
  setCookie(COOKIE_NAMES.SETTINGS, settingsString, COOKIE_EXPIRES.SETTINGS);
}

export function getDefaultCookieSettings(): CookieSettings {
  return {
    theme: 'system',
    language: 'id',
    sidebarState: 'expanded',
    notificationsEnabled: true,
  };
}

export function applyAnalyticsCookies(): void {
  console.log('Analytics cookies enabled');
}

export function applyMarketingCookies(): void {
  console.log('Marketing cookies enabled');
}

export function removeAnalyticsCookies(): void {
  console.log('Analytics cookies disabled');
}

export function removeMarketingCookies(): void {
  console.log('Marketing cookies disabled');
}
