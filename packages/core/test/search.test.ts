/** @format */

import { describe, expect, test } from "bun:test";
import { createStopSearch } from "../src/search";

const names = [
  "ABES College",
  "Lal Kuan",
  "Vijay Nagar",
  "Hapur Chungi",
  "Raj Nagar",
  "Navyug Market",
  "Kavi Nagar",
  "Mohan Nagar",
  "Crossings Republik",
  "Dundahera",
  "Ghaziabad Station",
  "Lohia Nagar",
  "Pratap Vihar",
  "Turab Nagar",
  "Vaishali",
  "Indirapuram",
  "Noida Sector 62",
  "Raj Nagar Extension",
  "Sahibabad",
  "Anand Vihar",
];
const search = createStopSearch(
  names.map((name, i) => ({ id: `S${i}`, name })),
);
const find = (q: string, limit?: number) => search(q, limit).map((s) => s.name);

describe("stop search", () => {
  test("nothing typed, nothing shown", () => {
    expect(find("")).toEqual([]);
    expect(find("   ")).toEqual([]);
  });

  test("a word start ranks first: 'raj' → Raj Nagar before Raj Nagar Extension", () => {
    expect(find("raj").slice(0, 2)).toEqual([
      "Raj Nagar",
      "Raj Nagar Extension",
    ]);
  });

  test("letters in order, with or without spaces: 'rj ngr', 'rajnagar', 'rjngr' find Raj Nagar", () => {
    expect(find("rj ngr")).toContain("Raj Nagar");
    expect(find("rajnagar")[0]).toBe("Raj Nagar");
    expect(find("rjngr")).toContain("Raj Nagar");
  });

  test("one typo is forgiven: 'hapor' finds Hapur Chungi, 'navyg' finds Navyug Market", () => {
    expect(find("hapor")[0]).toBe("Hapur Chungi");
    expect(find("navyg")[0]).toBe("Navyug Market");
  });

  test("case and spacing don't matter", () => {
    expect(find("  MOHAN nagar ")[0]).toBe("Mohan Nagar");
  });

  test("the list is capped", () => {
    expect(find("nagar").length).toBeLessThanOrEqual(8);
    expect(find("nagar", 3)).toHaveLength(3);
    expect(find("nagar")).toContain("Kavi Nagar");
  });

  test("no match is an empty list, not an error", () => {
    expect(find("zzzz")).toEqual([]);
  });
});
