/** @format */

// The demo network. Placeholder Ghaziabad-area stop names; swap in real ones any time.
// Timetable offsets are deliberately ~15 min optimistic per route (reality lives in the replay script).

import type { RouteDef } from "../src/types";

export const ROUTES: RouteDef[] = [
  {
    code: "R1",
    name: "1",
    firstDeparture: 6 * 60,
    stops: [
      ["ABES College", 0],
      ["Lal Kuan", 6],
      ["Vijay Nagar", 12],
      ["Hapur Chungi", 18],
      ["Raj Nagar", 24],
      ["Navyug Market", 30],
      ["Kavi Nagar", 36],
      ["Mohan Nagar", 45],
    ],
  },
  {
    code: "R2",
    name: "2",
    firstDeparture: 6 * 60 + 15,
    stops: [
      ["Crossings Republik", 0],
      ["Dundahera", 7],
      ["Vijay Nagar", 15],
      ["Hapur Chungi", 21],
      ["Ghaziabad Station", 29],
      ["Lohia Nagar", 36],
      ["Pratap Vihar", 44],
    ],
  },
  {
    code: "R3",
    name: "3",
    firstDeparture: 6 * 60 + 30,
    stops: [
      ["Navyug Market", 0],
      ["Turab Nagar", 6],
      ["Vaishali", 16],
      ["Indirapuram", 24],
      ["Noida Sector 62", 34],
    ],
  },
  {
    code: "R4",
    name: "4",
    firstDeparture: 6 * 60 + 45,
    stops: [
      ["Raj Nagar Extension", 0],
      ["Raj Nagar", 10],
      ["Ghaziabad Station", 18],
      ["Sahibabad", 28],
      ["Vaishali", 36],
      ["Indirapuram", 44],
      ["Anand Vihar", 52],
    ],
  },
];

/** Last UP departure; DN departures run one hour behind. */
export const LAST_DEPARTURE_HOUR = 21;

export const stopId = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
