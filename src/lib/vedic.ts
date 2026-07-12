/**
 * src/lib/vedic.ts
 * Vedic calendar utility library for Gaudiya Vaishnava Ekadashi calculations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER — Port your custom calculator logic into this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The exported interfaces and stub functions below define the expected API
 * contract. Replace the stub implementations with your real astronomical logic.
 *
 * Key concepts for implementors:
 *   • Tithi: A lunar day (1/30th of a synodic month ≈ 23h 37m – 26h 6m)
 *   • Ekadashi: The 11th tithi of each paksha (waxing/waning fortnight)
 *   • Arunodaya: Pre-dawn period (~96 minutes before sunrise)
 *   • Arunodaya Viddhi: Ekadashi that touches Arunodaya (pre-dawn) is observed
 *   • Viddha: Ekadashi "mixed with" Dashami or Dvadashi — complex eligibility rules
 *   • Parana: The window to break the Ekadashi fast (next day, after sunrise,
 *             before Dvadashi ends; typically a 3–5 hour window)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Paksha = 'Shukla' | 'Krishna'

export interface TithiResult {
  /** Tithi number (1–30, where 11 = Ekadashi) */
  tithi: number
  paksha: Paksha
  /** Julian Day Number for the moment of calculation */
  jd: number
  /** Fraction of the tithi completed (0.0 – 1.0) */
  fraction: number
}

export interface EkadashiResult {
  /** ISO 8601 date string (YYYY-MM-DD) in the observer's timezone */
  date: string
  name: string
  paksha: Paksha
  /** Whether this Ekadashi is Viddha (impure — touched by Dashami) */
  isViddha: boolean
  /** Whether Arunodaya Viddhi applies (Ekadashi touches pre-dawn period) */
  arunodayaViddhi: boolean
  /** Parana start time in HH:MM (observer's local time) */
  paranaStart: string
  /** Parana end time in HH:MM (observer's local time) */
  paranaEnd: string
  /** Latitude of observer (degrees, N positive) */
  latitude: number
  /** Longitude of observer (degrees, E positive) */
  longitude: number
  /** IANA timezone identifier */
  timezone: string
}

export interface LocationParams {
  /** Latitude in decimal degrees (N positive) */
  latitude: number
  /** Longitude in decimal degrees (E positive) */
  longitude: number
  /** IANA timezone name, e.g. 'Asia/Kolkata' */
  timezone: string
}

// ─── Astronomical Constants ────────────────────────────────────────────────

/** Mean synodic month length in days */
export const SYNODIC_MONTH = 29.53058868

/** Duration of Arunodaya period in minutes before sunrise */
export const ARUNODAYA_MINUTES = 96

/** Tithi number for Ekadashi */
export const EKADASHI_TITHI = 11

// ─── Stub Implementations (replace with real logic) ───────────────────────

/**
 * Convert a Gregorian calendar date to a Julian Day Number.
 *
 * TODO: Implement using the standard formula:
 *   JD = 367*Y - INT(7*(Y+INT((M+9)/12))/4) + INT(275*M/9) + D + 1721013.5
 *
 * @param year  Gregorian year
 * @param month Month (1–12)
 * @param day   Day of month
 * @param hour  UTC hour (default 12.0 = noon)
 */
export function gregorianToJulianDay(
  year: number,
  month: number,
  day: number,
  hour = 12.0
): number {
  // PLACEHOLDER — replace with real JD formula
  console.warn('vedic.ts: gregorianToJulianDay() is a stub. Implement me.')
  return 0
}

/**
 * Compute the current tithi for a given Julian Day Number.
 *
 * The tithi is determined by the difference between the longitudes of
 * the Moon and Sun, divided into 12° segments (30 tithis per month).
 *
 * TODO: Requires Swiss Ephemeris data or equivalent lunar/solar longitude tables.
 *
 * @param jd  Julian Day Number (UT)
 */
export function getTithi(jd: number): TithiResult {
  // PLACEHOLDER
  console.warn('vedic.ts: getTithi() is a stub. Implement me.')
  return {
    tithi: 0,
    paksha: 'Shukla',
    jd,
    fraction: 0,
  }
}

/**
 * Compute local sunrise for a given date and location.
 *
 * TODO: Use the USNO sunrise algorithm or Jean Meeus "Astronomical Algorithms".
 *   Key inputs: JD, latitude, longitude, timezone offset.
 *   Returns time as "HH:MM" in local time.
 *
 * @param jd        Julian Day Number
 * @param location  Observer location
 */
export function getSunrise(jd: number, location: LocationParams): string {
  // PLACEHOLDER
  console.warn('vedic.ts: getSunrise() is a stub. Implement me.')
  return '06:00'
}

/**
 * Determine Arunodaya time (96 minutes before sunrise) for a given date.
 *
 * Per Gaudiya Vaishnava tradition (based on Hari-bhakti-vilāsa),
 * Arunodaya is 4 ghatikas (96 minutes) before sunrise.
 *
 * @param sunriseHHMM  Sunrise time as "HH:MM" string
 */
export function getArunodaya(sunriseHHMM: string): string {
  const [h, m] = sunriseHHMM.split(':').map(Number)
  const totalMinutes = h * 60 + m - ARUNODAYA_MINUTES
  const ah = Math.floor(totalMinutes / 60)
  const am = totalMinutes % 60
  return `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`
}

/**
 * Check whether Ekadashi tithi is present at Arunodaya (Arunodaya Viddhi).
 *
 * Gaudiya rule: If the Ekadashi tithi is prevailing at Arunodaya time,
 * that is the observance day — even if Dashami (10th tithi) also touches
 * that day.
 *
 * TODO: Pass actual JD values for Arunodaya and tithi start/end times.
 *
 * @param ekadashiStartJD   JD when Ekadashi tithi begins
 * @param arunodayaJD       JD of Arunodaya on the candidate date
 */
export function isArunodayaViddhi(
  ekadashiStartJD: number,
  arunodayaJD: number
): boolean {
  // PLACEHOLDER — real logic: ekadashiStartJD <= arunodayaJD < ekadashiEndJD
  console.warn('vedic.ts: isArunodayaViddhi() is a stub. Implement me.')
  return false
}

/**
 * Compute the Parana (fast-breaking) window for a given Ekadashi.
 *
 * Rules:
 *  1. Must be after sunrise on the day after Ekadashi (Dvadashi)
 *  2. Must be before Dvadashi tithi ends
 *  3. Optimal window: within the first quarter of the day
 *
 * TODO: Integrate with tithi end-time calculation for Dvadashi.
 *
 * @param dvadashiDate  ISO date of Dvadashi (day after Ekadashi)
 * @param location      Observer location
 */
export function computeParana(
  dvadashiDate: string,
  location: LocationParams
): { start: string; end: string } {
  // PLACEHOLDER
  console.warn('vedic.ts: computeParana() is a stub. Implement me.')
  return { start: '06:30', end: '09:00' }
}

/**
 * Get all Ekadashi dates for a given Gregorian year.
 *
 * TODO: Iterate through all new/full moon cycles in the year,
 *   identify each 11th tithi, and apply Viddha/Arunodaya rules.
 *
 * @param year      Gregorian year (e.g., 2026)
 * @param location  Observer location (defaults to Mayapur, West Bengal)
 */
export function getEkadashisForYear(
  year: number,
  location: LocationParams = {
    latitude:  23.4298,
    longitude: 88.3780,
    timezone:  'Asia/Kolkata',
  }
): EkadashiResult[] {
  // PLACEHOLDER — real implementation would calculate ~24 Ekadashis per year
  console.warn('vedic.ts: getEkadashisForYear() is a stub. Implement me.')
  return []
}
