/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by scripts/derive-site-climate.ts from ERA5 reanalysis via
 * Open-Meteo's archive API, over 1995-01-01 to 2024-12-31 (10958 days per place).
 * Re-run that script to regenerate; see its header for what each figure means
 * and why the lookup happens at build time rather than in the browser.
 *
 *   designLowC   mean of the 30 annual minimums — ASHRAE's extreme annual
 *                mean minimum, which is what NEC 690.7 points at
 *   recordLowC   coldest single day in the window
 *   designHighC  mean of the annual maximums
 *   recordHighC  hottest single day in the window
 *
 * ERA5 is a ~25km grid, not a weather station. It smooths local extremes, so a
 * nearby station's all-time record is usually colder than recordLowC here.
 * Every row is a named place and claims nothing about the region around it.
 */

import type { SiteClimate } from './site-climate'

export const SITE_CLIMATE_WINDOW = { start: '1995-01-01', end: '2024-12-31' } as const

export const SITE_CLIMATES: SiteClimate[] = [
  { id: 'us-phoenix-az', place: 'Phoenix, AZ', region: 'United States', lat: 33.45, lon: -112.07, designLowC: -0.9, recordLowC: -3.5, designHighC: 46, recordHighC: 48.5 },
  { id: 'us-flagstaff-az', place: 'Flagstaff, AZ', region: 'United States', lat: 35.2, lon: -111.65, designLowC: -15.9, recordLowC: -20.5, designHighC: 33.9, recordHighC: 36 },
  { id: 'us-los-angeles-ca', place: 'Los Angeles, CA', region: 'United States', lat: 34.05, lon: -118.24, designLowC: 0.9, recordLowC: -1.9, designHighC: 40.7, recordHighC: 45.7 },
  { id: 'us-sacramento-ca', place: 'Sacramento, CA', region: 'United States', lat: 38.58, lon: -121.49, designLowC: -1.7, recordLowC: -4, designHighC: 42.6, recordHighC: 47.4 },
  { id: 'us-truckee-ca', place: 'Truckee, CA', region: 'United States', lat: 39.33, lon: -120.18, designLowC: -13.5, recordLowC: -19.6, designHighC: 33.7, recordHighC: 36.7 },
  { id: 'us-denver-co', place: 'Denver, CO', region: 'United States', lat: 39.74, lon: -104.99, designLowC: -25.9, recordLowC: -36.5, designHighC: 35.7, recordHighC: 38.5 },
  { id: 'us-miami-fl', place: 'Miami, FL', region: 'United States', lat: 25.76, lon: -80.19, designLowC: 7.7, recordLowC: 3.3, designHighC: 32.8, recordHighC: 36.2 },
  { id: 'us-orlando-fl', place: 'Orlando, FL', region: 'United States', lat: 28.54, lon: -81.38, designLowC: 0.6, recordLowC: -2.5, designHighC: 35.5, recordHighC: 37.7 },
  { id: 'us-atlanta-ga', place: 'Atlanta, GA', region: 'United States', lat: 33.75, lon: -84.39, designLowC: -8.3, recordLowC: -13.6, designHighC: 35.4, recordHighC: 40 },
  { id: 'us-boise-id', place: 'Boise, ID', region: 'United States', lat: 43.62, lon: -116.2, designLowC: -15.8, recordLowC: -23.7, designHighC: 39.7, recordHighC: 42 },
  { id: 'us-chicago-il', place: 'Chicago, IL', region: 'United States', lat: 41.88, lon: -87.63, designLowC: -21.7, recordLowC: -32.5, designHighC: 33, recordHighC: 37.4 },
  { id: 'us-indianapolis-in', place: 'Indianapolis, IN', region: 'United States', lat: 39.77, lon: -86.16, designLowC: -20.6, recordLowC: -27.6, designHighC: 34.3, recordHighC: 38.5 },
  { id: 'us-wichita-ks', place: 'Wichita, KS', region: 'United States', lat: 37.69, lon: -97.34, designLowC: -17.1, recordLowC: -28.4, designHighC: 38.3, recordHighC: 42.4 },
  { id: 'us-new-orleans-la', place: 'New Orleans, LA', region: 'United States', lat: 29.95, lon: -90.07, designLowC: -0.8, recordLowC: -5.3, designHighC: 34.5, recordHighC: 39 },
  { id: 'us-portland-me', place: 'Portland, ME', region: 'United States', lat: 43.66, lon: -70.26, designLowC: -20.3, recordLowC: -28.2, designHighC: 31, recordHighC: 36.2 },
  { id: 'us-boston-ma', place: 'Boston, MA', region: 'United States', lat: 42.36, lon: -71.06, designLowC: -19.6, recordLowC: -26.4, designHighC: 35.3, recordHighC: 40.3 },
  { id: 'us-detroit-mi', place: 'Detroit, MI', region: 'United States', lat: 42.33, lon: -83.05, designLowC: -20.9, recordLowC: -28.7, designHighC: 33.6, recordHighC: 37.1 },
  { id: 'us-minneapolis-mn', place: 'Minneapolis, MN', region: 'United States', lat: 44.98, lon: -93.27, designLowC: -29.2, recordLowC: -38.3, designHighC: 34.5, recordHighC: 37.5 },
  { id: 'us-kansas-city-mo', place: 'Kansas City, MO', region: 'United States', lat: 39.1, lon: -94.58, designLowC: -21.4, recordLowC: -28.4, designHighC: 37.5, recordHighC: 41.9 },
  { id: 'us-billings-mt', place: 'Billings, MT', region: 'United States', lat: 45.78, lon: -108.5, designLowC: -30.1, recordLowC: -39.2, designHighC: 38.6, recordHighC: 41.8 },
  { id: 'us-omaha-ne', place: 'Omaha, NE', region: 'United States', lat: 41.26, lon: -95.93, designLowC: -26.1, recordLowC: -36.1, designHighC: 36.6, recordHighC: 39.5 },
  { id: 'us-las-vegas-nv', place: 'Las Vegas, NV', region: 'United States', lat: 36.17, lon: -115.14, designLowC: -3.1, recordLowC: -6.9, designHighC: 44.1, recordHighC: 47.4 },
  { id: 'us-albuquerque-nm', place: 'Albuquerque, NM', region: 'United States', lat: 35.08, lon: -106.65, designLowC: -11.9, recordLowC: -22.8, designHighC: 38.2, recordHighC: 40 },
  { id: 'us-buffalo-ny', place: 'Buffalo, NY', region: 'United States', lat: 42.89, lon: -78.88, designLowC: -18.1, recordLowC: -23, designHighC: 30.6, recordHighC: 34 },
  { id: 'us-new-york-ny', place: 'New York, NY', region: 'United States', lat: 40.71, lon: -74.01, designLowC: -15.8, recordLowC: -23.8, designHighC: 35.2, recordHighC: 38.6 },
  { id: 'us-charlotte-nc', place: 'Charlotte, NC', region: 'United States', lat: 35.23, lon: -80.84, designLowC: -8.7, recordLowC: -14.8, designHighC: 36.9, recordHighC: 41.9 },
  { id: 'us-fargo-nd', place: 'Fargo, ND', region: 'United States', lat: 46.88, lon: -96.79, designLowC: -32.7, recordLowC: -40.8, designHighC: 34.6, recordHighC: 39.2 },
  { id: 'us-columbus-oh', place: 'Columbus, OH', region: 'United States', lat: 39.96, lon: -82.99, designLowC: -20.3, recordLowC: -28.9, designHighC: 33.4, recordHighC: 38.1 },
  { id: 'us-oklahoma-city-ok', place: 'Oklahoma City, OK', region: 'United States', lat: 35.47, lon: -97.52, designLowC: -13.2, recordLowC: -25.8, designHighC: 39.5, recordHighC: 43.7 },
  { id: 'us-portland-or', place: 'Portland, OR', region: 'United States', lat: 45.51, lon: -122.68, designLowC: -7, recordLowC: -15.4, designHighC: 37.6, recordHighC: 46 },
  { id: 'us-bend-or', place: 'Bend, OR', region: 'United States', lat: 44.06, lon: -121.31, designLowC: -18.4, recordLowC: -33, designHighC: 35.5, recordHighC: 39.8 },
  { id: 'us-philadelphia-pa', place: 'Philadelphia, PA', region: 'United States', lat: 39.95, lon: -75.17, designLowC: -14.8, recordLowC: -22.6, designHighC: 36, recordHighC: 39.9 },
  { id: 'us-charleston-sc', place: 'Charleston, SC', region: 'United States', lat: 32.78, lon: -79.93, designLowC: -2.9, recordLowC: -11.4, designHighC: 34.6, recordHighC: 36.8 },
  { id: 'us-rapid-city-sd', place: 'Rapid City, SD', region: 'United States', lat: 44.08, lon: -103.23, designLowC: -25.3, recordLowC: -31.1, designHighC: 37.4, recordHighC: 41.6 },
  { id: 'us-nashville-tn', place: 'Nashville, TN', region: 'United States', lat: 36.16, lon: -86.78, designLowC: -11.6, recordLowC: -20.8, designHighC: 36.8, recordHighC: 41.4 },
  { id: 'us-austin-tx', place: 'Austin, TX', region: 'United States', lat: 30.27, lon: -97.74, designLowC: -4.5, recordLowC: -15.3, designHighC: 39.5, recordHighC: 42.4 },
  { id: 'us-amarillo-tx', place: 'Amarillo, TX', region: 'United States', lat: 35.22, lon: -101.83, designLowC: -14.7, recordLowC: -23.2, designHighC: 38.8, recordHighC: 42.6 },
  { id: 'us-houston-tx', place: 'Houston, TX', region: 'United States', lat: 29.76, lon: -95.37, designLowC: -2.9, recordLowC: -10.9, designHighC: 37.7, recordHighC: 41.7 },
  { id: 'us-salt-lake-city-ut', place: 'Salt Lake City, UT', region: 'United States', lat: 40.76, lon: -111.89, designLowC: -18.7, recordLowC: -24.3, designHighC: 38, recordHighC: 40.2 },
  { id: 'us-burlington-vt', place: 'Burlington, VT', region: 'United States', lat: 44.48, lon: -73.21, designLowC: -24.4, recordLowC: -29.8, designHighC: 32.2, recordHighC: 35.8 },
  { id: 'us-richmond-va', place: 'Richmond, VA', region: 'United States', lat: 37.54, lon: -77.44, designLowC: -11.2, recordLowC: -22.9, designHighC: 36.7, recordHighC: 39.7 },
  { id: 'us-seattle-wa', place: 'Seattle, WA', region: 'United States', lat: 47.61, lon: -122.33, designLowC: -6.8, recordLowC: -14.6, designHighC: 32.4, recordHighC: 37.9 },
  { id: 'us-spokane-wa', place: 'Spokane, WA', region: 'United States', lat: 47.66, lon: -117.43, designLowC: -19.3, recordLowC: -29.4, designHighC: 37.9, recordHighC: 43.9 },
  { id: 'us-milwaukee-wi', place: 'Milwaukee, WI', region: 'United States', lat: 43.04, lon: -87.91, designLowC: -21.6, recordLowC: -30.8, designHighC: 32.2, recordHighC: 37.6 },
  { id: 'us-cheyenne-wy', place: 'Cheyenne, WY', region: 'United States', lat: 41.14, lon: -104.82, designLowC: -25.9, recordLowC: -34.1, designHighC: 33.9, recordHighC: 36.1 },
  { id: 'us-anchorage-ak', place: 'Anchorage, AK', region: 'United States', lat: 61.22, lon: -149.9, designLowC: -25.2, recordLowC: -32.8, designHighC: 23.7, recordHighC: 32.5 },
  { id: 'us-honolulu-hi', place: 'Honolulu, HI', region: 'United States', lat: 21.31, lon: -157.86, designLowC: 17.7, recordLowC: 14.5, designHighC: 29.4, recordHighC: 31.3 },
  { id: 'ca-vancouver', place: 'Vancouver, BC', region: 'Canada', lat: 49.28, lon: -123.12, designLowC: -9.1, recordLowC: -16.2, designHighC: 30.3, recordHighC: 36.4 },
  { id: 'ca-calgary', place: 'Calgary, AB', region: 'Canada', lat: 51.05, lon: -114.07, designLowC: -33.4, recordLowC: -39.4, designHighC: 31.5, recordHighC: 36.7 },
  { id: 'ca-winnipeg', place: 'Winnipeg, MB', region: 'Canada', lat: 49.9, lon: -97.14, designLowC: -35.6, recordLowC: -41.4, designHighC: 32.8, recordHighC: 38.5 },
  { id: 'ca-toronto', place: 'Toronto, ON', region: 'Canada', lat: 43.65, lon: -79.38, designLowC: -19, recordLowC: -25.1, designHighC: 29.8, recordHighC: 34 },
  { id: 'ca-montreal', place: 'Montreal, QC', region: 'Canada', lat: 45.5, lon: -73.57, designLowC: -27.7, recordLowC: -32.3, designHighC: 32.1, recordHighC: 34.8 },
  { id: 'ca-halifax', place: 'Halifax, NS', region: 'Canada', lat: 44.65, lon: -63.57, designLowC: -17.8, recordLowC: -26.4, designHighC: 27.3, recordHighC: 31 },
  { id: 'gb-london', place: 'London', region: 'Britain & Ireland', lat: 51.51, lon: -0.13, designLowC: -5, recordLowC: -10.3, designHighC: 30.1, recordHighC: 37.9 },
  { id: 'gb-manchester', place: 'Manchester', region: 'Britain & Ireland', lat: 53.48, lon: -2.24, designLowC: -5.9, recordLowC: -15, designHighC: 27.4, recordHighC: 36.1 },
  { id: 'gb-edinburgh', place: 'Edinburgh', region: 'Britain & Ireland', lat: 55.95, lon: -3.19, designLowC: -5.4, recordLowC: -11.9, designHighC: 24.5, recordHighC: 28.8 },
  { id: 'ie-dublin', place: 'Dublin', region: 'Britain & Ireland', lat: 53.35, lon: -6.26, designLowC: -2.4, recordLowC: -8.8, designHighC: 23.9, recordHighC: 27.3 },
]
