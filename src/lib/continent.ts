// The continent of a country (ISO 3166 alpha-2, any case), as the events page groups them. Unknown codes return null.
const C: Record<string, string> = {};
const add = (continent: string, codes: string) => codes.split(" ").forEach((c) => (C[c] = continent));
add("North America", "US CA MX GT BZ SV HN NI CR PA CU JM HT DO BS BB TT PR GD LC VC AG DM KN");
add("South America", "BR AR CL CO PE VE EC BO PY UY GY SR");
add("Europe", "GB IE FR DE IT ES PT NL BE LU AT CH LI SE NO DK FI IS PL CZ SK HU GR RO BG HR SI EE LV LT MT CY RS BA ME MK AL XK MD UA BY RU AD MC SM VA GI");
add("Asia", "JP KR CN TW HK MO SG MY TH VN PH ID IN LK NP BD PK MM KH LA MN KZ UZ KG TJ TM AE SA IL TR QA KW BH OM JO LB IR IQ AM AZ GE BN");
add("Oceania", "AU NZ FJ PG WS TO VU NC PF GU");
add("Africa", "ZA EG MA TN DZ NG GH KE ET TZ UG RW SN CI CM AO MZ ZW ZM BW NA MU MG");
export const continentOf = (cc: string | null | undefined): string | null => C[(cc ?? "").toUpperCase()] ?? null;
