# Draft team posts (not sent)

## 1. Platform enum change: add `shuttle`

Proposed change to the run schema `platform` enum:

- Before: `iss`, `drop_tower`, `parabolic_flight`
- After: `iss`, `drop_tower`, `parabolic_flight`, `shuttle`

Reason: the two seed SSCE papers (NTRS 19950007798, 19970020608) report Space Shuttle Orbiter flights (STS-50/USML-1, STS-54, STS-63, STS-64). Those 11 runs (FS-0001 to FS-0011) need `shuttle`. Shuttle runs get their own group, separate from ISS, drop-tower, and parabolic-flight runs.

Also proposed: `cygnus`. The Saffire PSI tables (PSI-98, 99, 100) record runs on the Cygnus vehicle. I've added it provisionally so the pipeline can ingest them (FS-1252 to FS-1264). Please approve it or name a replacement.

Open question: Spread Across Liquids (NTRS 19990054039) flew on sounding rockets. Should we add `sounding_rocket`, or use an `other` value?

## 2. Atmosphere targets: confirmation request for the team lead

| Target | Value | Source | Status |
|---|---|---|---|
| Moon surface | 8.2 psia (56.537 kPa), 34% O2 | NASA/TM-2013-217377, abstract (NTRS 20130013505) | Please confirm |
| Mars transit and analog | 101 kPa, 21% O2 | No source on file | Need a citation |

Notes:
- The TM abstract says the Exploration Atmospheres Working Group first recommended 8.0 psia / 32% O2, then raised it to 8.2 psia / 34% O2. Please confirm that 8.2 / 34 is the target we use.
- Please send a citable source for the Mars 101 kPa / 21% target. It stays out of the dashboard until it has one.
