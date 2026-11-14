# Sources and references

Every data source, API, tool, and reference used to build Flamescope, with its URL. All were retrieved or used on 2026-11-14.

> **SI flag:** this list was compiled by SI (Claude by Anthropic, via Claude Code) from the URLs the build actually used. The project idea is human.

## 1. NASA data ingested

### NASA Technical Reports Server (NTRS)
- **NTRS 19950007798 (D-0001)**, Altenkirch et al., 1994: *The Solid Surface Combustion Experiment Aboard the USML-1 Mission*.
  - Full text retrieved (FS-0001 to FS-0005).
  - Terms: NTRS "may include copyright material", so only short excerpts are published.
  - Record: https://ntrs.nasa.gov/citations/19950007798
  - API: https://ntrs.nasa.gov/api/citations/19950007798
  - Text: https://ntrs.nasa.gov/api/citations/19950007798/downloads/19950007798.txt
  - PDF: https://ntrs.nasa.gov/api/citations/19950007798/downloads/19950007798.pdf
- **NTRS 19970020608 (D-0002)**, Altenkirch et al., 1997: *Solid Surface Combustion Experiment: Thick Fuel Results*.
  - Full text retrieved (FS-0006 to FS-0011). Same copyright terms: short excerpts only.
  - Record: https://ntrs.nasa.gov/citations/19970020608
  - API: https://ntrs.nasa.gov/api/citations/19970020608
  - Text: https://ntrs.nasa.gov/api/citations/19970020608/downloads/19970020608.txt
  - PDF: https://ntrs.nasa.gov/api/citations/19970020608/downloads/19970020608.pdf
- **NTRS 19990054039 (D-0003)**, Ross and Miller, 1999: *Flame Spread Across Liquids: Experimental Results*.
  - Abstract only; NTRS has no downloadable file. Terms: government public use permitted.
  - Record: https://ntrs.nasa.gov/citations/19990054039
  - API: https://ntrs.nasa.gov/api/citations/19990054039
- **NTRS 20130013505 (D-0004)**, Norcross et al., 2013: NASA/TM-2013-217377, *Effects of the 8 psia / 32% O2 Atmosphere on the Human in the Spaceflight Environment*.
  - Source of the Moon target, 8.2 psia / 34% O2. Terms: public use permitted.
  - Record: https://ntrs.nasa.gov/citations/20130013505
  - API: https://ntrs.nasa.gov/api/citations/20130013505
  - Text: https://ntrs.nasa.gov/api/citations/20130013505/downloads/20130013505.txt
- **NTRS search API** used to find candidates: https://ntrs.nasa.gov/api/citations/search

### NASA Physical Sciences Informatics (PSI)
All six investigations are licensed CC0-1.0 (https://spdx.org/licenses/CC0-1.0.html). PSI requires citing each dataset DOI.

| Doc | Investigation | Page | DOI | Experiment table (runs) |
|---|---|---|---|---|
| D-0005 | BASS-II (PSI-25) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 | https://doi.org/10.60555/4qc4-de67 | `PSI-25_Experimental table_BASS-II.csv` (129 runs) |
| D-0006 | BASS (PSI-26) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-26 | https://doi.org/10.60555/58h4-dy80 | `PSI-26_Experimental table_BASS.csv` (122 runs) |
| D-0007 | Saffire-I (PSI-98) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-98 | https://doi.org/10.60555/0t15-1z43 | `PSI-98_Experimental table_SAFFIRE-1.csv` (2 runs) |
| D-0008 | Saffire-II (PSI-99) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-99 | https://doi.org/10.60555/2chp-m469 | `PSI-99_Experimental table_SAFFIRE-2.csv` (9 runs) |
| D-0009 | Saffire-III (PSI-100) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-100 | https://doi.org/10.60555/040q-4h36 | `PSI-100_Experimental table_SAFFIRE-3.csv` (2 runs) |
| D-0010 | BASS flamelet modeling (PSI-62) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-62 | https://doi.org/10.60555/e9xp-ex83 | none (ground modeling) |

PSI API endpoints:
- Investigation metadata: `https://psi.nasa.gov/geode-py/ws/repo/investigations/<PSI-n>`
- File download (returns a signed S3 URL): `https://psi.nasa.gov/geode-py/ws/studies/<PSI-n>/download?file=<name>&version=<v>&redirect=false`
- Search: https://psi.nasa.gov/geode-py/ws/repo/search?term=flame%20spread&source=psi&type=investigation

### NASA reference pages consulted
- NASA Biological and Physical Sciences data (the PSI landing page): https://science.nasa.gov/biological-physical/data/
- BPS Data Management Policy: https://science.nasa.gov/biological-physical/data/bps-data-management/
- PSI database guide (PDF): https://assets.science.nasa.gov/content/dam/science/bps/bps-general/bps-data_osdr_psi/Complete_PSI_Database_Guide.pdf
- NASA privacy policy and important notices: https://www.nasa.gov/nasa-web-privacy-policy-and-important-notices/

## 2. Found in searches, not ingested
These are candidates for the next round of seed documents.

| NTRS ID | Title | Record |
|---|---|---|
| 19960008391 | Flame spread across liquids | https://ntrs.nasa.gov/citations/19960008391 |
| 19970020607 | Flame Spread Across Liquids | https://ntrs.nasa.gov/citations/19970020607 |
| 20010073994 | Fluid Management of and Flame Spread Across Liquid Pools | https://ntrs.nasa.gov/citations/20010073994 |
| 20050179434 | Spread Across Liquids: The World's First Microgravity Combustion Experiment on a Sounding Rocket | https://ntrs.nasa.gov/citations/20050179434 |
| 20050199447 | Spread Across Liquids Continues to Fly | https://ntrs.nasa.gov/citations/20050199447 |
| 20040171930 | Analysis of the Spread Across Liquid-5 (SAL-5) Experiment Failure to Fill Properly During Flight | https://ntrs.nasa.gov/citations/20040171930 |
| 20150021491 | Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere | https://ntrs.nasa.gov/citations/20150021491 |
| 20090037002 | Method to Determine the Flammability Thresholds of Materials (ISO 14624) | https://ntrs.nasa.gov/citations/20090037002 |

## 3. Models and AI services
- **Claude by Anthropic, via Claude Code** (SI): generated the code, the extraction, the drafts, and the documentation. https://www.anthropic.com/claude and https://claude.com/claude-code
- **Groq API** (LLM inference for the answers): https://api.groq.com/openai/v1. Docs: https://console.groq.com/docs. Model: `openai/gpt-oss-20b` (set in `config.yaml`).
- **google/embeddinggemma-300m** (chosen embedding model; access pending): https://huggingface.co/google/embeddinggemma-300m. Pinned revision `57c266a740f537b4dc058e1b0cda161fd15afa75`.
- **BAAI/bge-multilingual-gemma2** (considered, not chosen): https://huggingface.co/BAAI/bge-multilingual-gemma2

## 4. Software, fonts, hosting
- **Python** standard library: https://docs.python.org/3/
- **sentence-transformers:** https://www.sbert.net
- **PyTorch:** https://pytorch.org
- **Hugging Face Transformers:** https://github.com/huggingface/transformers
- **NumPy:** https://numpy.org
- **PyYAML:** https://pyyaml.org
- **uv** (virtual environment): https://github.com/astral-sh/uv
- **Spectral** typeface: https://fonts.google.com/specimen/Spectral
- **IBM Plex Sans Condensed** typeface: https://fonts.google.com/specimen/IBM+Plex+Sans+Condensed
- **GitHub Pages:** https://pages.github.com
- **GitHub Actions** used to deploy:
  - https://github.com/actions/checkout
  - https://github.com/actions/configure-pages
  - https://github.com/actions/upload-pages-artifact
  - https://github.com/actions/deploy-pages
- **BM25 ranking:** implemented from the standard formula, with no library. Parameters: k1 1.2, b 0.75.

## 5. Challenge material
- NASA Space Apps Challenge 2026 project submission guide: https://www.spaceappschallenge.org/resources/project-submission-guide/
- NASA Space Apps judging and awards guide: linked from the submission guide.
