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
npm test        # unit tests of assets/tools/lib
npm run serve   # http://localhost:1313/
```

CyberChef is not in git: the deploy workflow downloads the official GCHQ release (`CYBERCHEF_VERSION` in
`.github/workflows/deploy.yml`) into `static/cyberchef/`. To have it locally:
`gh release download v11.5.0 -R gchq/CyberChef -p '*.zip' -D /tmp/cc && unzip /tmp/cc/*.zip -d static/cyberchef && mv static/cyberchef/CyberChef_*.html static/cyberchef/index.html`.

Update the theme: `git submodule update --remote themes/wem`, then commit `themes/wem`.

## Third-party code and data

| | Licence |
|---|---|
| [CyberChef](https://github.com/gchq/CyberChef) (downloaded at build time, unmodified) | Apache-2.0 |
| [hash-wasm](https://github.com/Daninet/hash-wasm) | MIT |
| [jose](https://github.com/panva/jose) | MIT |
| [cronstrue](https://github.com/bradymholt/cRonstrue) | MIT |
| [ipaddr.js](https://github.com/whitequark/ipaddr.js) | MIT |
| [oui-data](https://github.com/silverwind/oui-data) (IEEE registry) | BSD-2-Clause |
| [port-numbers](https://github.com/silverwind/port-numbers) (IANA registry) | BSD-2-Clause |
| [EFF large wordlist](https://www.eff.org/dice) via eff-diceware-passphrase | CC BY 3.0 US (list), ISC (package) |
