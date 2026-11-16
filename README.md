# tools.wemy.ninja

Small security and sysadmin tools that run entirely in the browser: nothing typed in them is sent anywhere.
A Hugo site on the [wem theme](https://github.com/wem-r/hugo-theme-wem), deployed to GitHub Pages by Actions.

## Layout

| Path | What |
|---|---|
| `content/en/<section>/<tool>.md` | one page per tool; front matter `tool: <name>` turns the page into a tool |
| `layouts/_partials/tools/<name>.html` | the tool's form |
| `assets/tools/<name>.js` | the tool's script (bundled per page by Hugo's `js.Build`, npm imports allowed) |
| `assets/tools/lib/*.js` | pure logic shared by tools, unit-tested in `tests/` |
| `assets/js/tk.js` | small DOM / bytes helpers used by every tool |
| `assets/css/site.css` | form controls and outputs (theme colour tokens) |
| `layouts/_partials/data/*.html` | data files built from npm packages (MAC vendors, IANA ports, EFF wordlist) |
| `/vendor/…` (module mounts in `hugo.toml`) | big runtime files copied from npm: pdf.js worker / fonts / wasm, qpdf.wasm, Tesseract core + English & French data |
| `layouts/_partials/hooks/note-end.html` | renders the tool form + script under the page text |
| `themes/wem` | git submodule: `wem-r/hugo-theme-wem` |

## Add a tool

1. `content/en/<section>/<name>.md` with `title`, `description`, `tool: <name>`, `tags`, optionally `credit:` and `kb: [{title, url}]`.
2. `layouts/_partials/tools/<name>.html` — markup, using the `tk-*` classes.
3. `assets/tools/<name>.js` — `import { $, live, kv, msg } from '../js/tk.js'`.
4. Pure logic goes in `assets/tools/lib/`, with a test in `tests/lib.test.js`.

## Work locally

```sh
git clone --recurse-submodules https://github.com/wem-r/tools.wemy.ninja.git
cd tools.wemy.ninja
npm ci          # Hugo extended (pinned) + the tools' libraries
npm test        # unit tests of assets/tools/lib (Node ≥ 22)
npm run serve   # http://localhost:1313/
```

CyberChef is not in git: the deploy workflow downloads the official GCHQ release (`CYBERCHEF_VERSION` in
`.github/workflows/deploy.yml`) into `static/vendor/cyberchef/`. To have it locally:
`gh release download v11.5.0 -R gchq/CyberChef -p '*.zip' -D /tmp/cc && unzip /tmp/cc/*.zip -d static/vendor/cyberchef && mv static/vendor/cyberchef/CyberChef_*.html static/vendor/cyberchef/index.html`.

Update the theme: `git submodule update --remote themes/wem`, then commit `themes/wem`.

## Third-party code and data

All run in the browser; none is modified.

| | Used by | Licence |
|---|---|---|
| [CyberChef](https://github.com/gchq/CyberChef) (downloaded at build time) | CyberChef | Apache-2.0 |
| [pdf.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`, with its wasm decoders) | PDF tools | Apache-2.0 (decoders: see `vendor/pdfjs/wasm/LICENSE_*`) |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | PDF tools | MIT |
| [qpdf](https://github.com/qpdf/qpdf) via [@neslinesli93/qpdf-wasm](https://github.com/neslinesli93/qpdf-wasm) | protect, unlock, repair, compress | Apache-2.0 / ISC |
| [Tesseract.js](https://github.com/naptha/tesseract.js) + core + `@tesseract.js-data/eng`, `fra` | OCR | Apache-2.0 (data: Apache-2.0, packages MIT) |
| [fflate](https://github.com/101arrowz/fflate) | ZIP downloads, PDF image decoding | MIT |
| [hash-wasm](https://github.com/Daninet/hash-wasm) | hashes, HMAC | MIT |
| [jose](https://github.com/panva/jose) | JWT | MIT |
| [js-cvss](https://github.com/pandatix/js-cvss) | CVSS | MIT |
| [jsdiff](https://github.com/kpdecker/jsdiff) | compare text | BSD-3-Clause |
| [exifr](https://github.com/MikeKovarik/exifr), [piexifjs](https://github.com/hMatoba/piexifjs) | EXIF | MIT |
| [jsQR](https://github.com/cozmo/jsQR) | QR reader | Apache-2.0 |
| [marked](https://github.com/markedjs/marked), [DOMPurify](https://github.com/cure53/DOMPurify) | HTML → PDF | MIT, Apache-2.0 / MPL-2.0 |
| [cronstrue](https://github.com/bradymholt/cRonstrue) | cron | MIT |
| [ipaddr.js](https://github.com/whitequark/ipaddr.js) | IPv6 | MIT |
| [oui-data](https://github.com/silverwind/oui-data) (IEEE registry) | MAC vendors | BSD-2-Clause |
| [port-numbers](https://github.com/silverwind/port-numbers) (IANA registry) | ports | BSD-2-Clause |
| [EFF large wordlist](https://www.eff.org/dice) via eff-diceware-passphrase | passphrases | CC BY 3.0 US (list), ISC (package) |

AGPL engines (MuPDF, Ghostscript) are deliberately not used.