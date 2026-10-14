# Porto bus tracker

A live map of STCP buses in Porto that runs in a phone or desktop browser. Tap a bus to see
its route, the stops ahead, and an estimate of how many minutes it needs to reach each of the
next five.

It is a single static web page with no backend, so it can be hosted for free on GitHub Pages.

## What it does

- **Trip search:** type an address and the app finds the direct buses from where you are,
  fastest first, with the stop to walk to, when the bus gets there, where to get off and the
  total time. Tap a result to follow that bus.
- **Live positions:** every bus currently reporting is shown on the map, labelled with its
  line, and refreshed every 10 seconds.
- **Follow a bus:** tap a bus, or type its number, to draw its route in orange and mark its
  stops. Stops already passed turn grey.
- **Time to the next stops:** the next five stops are listed with the minutes left, and
  labelled on the map.
- **Highlight a stop:** tap a stop in the list of a followed bus to see a large
  "minutes until this stop" figure.
- **Stop search:** start typing a stop name or code and pick from the suggestions, which show
  each stop's code and lines. The app then lists the buses on their way to that stop, soonest
  first.
- **Line search:** type a line number to show only that line on the map and list its buses
  with the direction each is heading. Tap one to follow it.

## How it works

The page asks a public data address (an API) for the list of buses, then draws them on a map.
Nothing is stored and there are no accounts.

| What | Where it comes from |
| --- | --- |
| Live bus positions | Porto's open-data platform (FIWARE broker run by Porto Digital), read directly by the page |
| Route paths and stop order | Files in `routes/`, copied from STCP's website |
| Stop names and positions | `stops.json`, copied from STCP's website |
| Which stops each line serves | `lines.json`, built from the route files |
| Turning an address into a map position | OpenStreetMap's Nominatim search service |
| Your position | The phone or browser's own location feature, with your permission |
| Map images | OpenStreetMap |
| Map library | Leaflet 1.9.4, loaded from unpkg |
| Font | Plus Jakarta Sans, loaded from Google Fonts |

### How the minutes are estimated

The app finds where the bus is along its route and measures the distance to each stop ahead.

- **Without the helper (default):** time is distance multiplied by a typical city bus pace of
  3.5 minutes per kilometre (about 17 km/h). These are rough estimates that ignore traffic and
  the timetable, and the app labels them as such.
- **With the helper:** the app asks STCP's arrivals service when this bus is due at a few
  stops along the route and fills in the stops between them by distance.

### How the trip search works

1. The address you type is looked up with Nominatim, limited to the Porto area.
2. The app takes your position from the browser and finds the stops within 600 m of you and
   within 600 m of the destination.
3. For every line it looks for a stop near you that comes before a stop near the destination,
   choosing the pair with the least walking.
4. For each such line it picks the nearest live bus that has not yet reached your stop and
   that you can still reach on foot, then adds up waiting, riding and walking.

Results are sorted by total time. Lines that go there but have no bus on the way are listed
underneath. If location access is refused, you can move the map and start from its centre.

**Privacy:** the address you type is sent to OpenStreetMap's search service. Your position is
used only inside the page and is not sent anywhere.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: layout, styling and logic |
| `stops.json` | All STCP stops as `[code, name, latitude, longitude]` |
| `routes/<line>_<direction>.json` | One file per line and direction: `c` is the path, `s` is the ordered stops |
| `lines.json` | The ordered stop codes of every line and direction, used by the trip search |
| `worker.js` | Optional Cloudflare Worker that relays STCP's arrivals data |
| `tools/build-data.mjs` | Script that regenerates `stops.json`, `lines.json` and `routes/` |

## Run it locally

The page loads its data files over HTTP, so opening `index.html` by double-clicking it will
show the map but not the routes. Serve the folder instead:

```bash
npx serve .
```

Then open the address it prints, usually `http://localhost:3000`.

## Host it on GitHub Pages

1. Open the repository's **Settings**, then **Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Choose the branch and the folder `/ (root)`, then **Save**.
4. After a minute or two the site is live at `https://<username>.github.io/<repository>/`.

Every push to that branch republishes the site. On a phone, use the browser's
**Add to Home screen** option to get an app-style icon.

## Optional: live predictions with the helper

STCP's arrivals data cannot be read by a web page on another site, so `worker.js` acts as a
small relay. It only forwards a fixed list of read-only addresses. With it connected the app
uses STCP's own predictions and can list every bus due at a chosen stop.

1. Create a free Cloudflare account and go to **Workers & Pages**, then **Create**, then
   **Worker**.
2. Replace the sample code with the contents of `worker.js` and deploy.
3. Copy the address Cloudflare gives you.
4. In `index.html`, replace `PASTE-YOUR-WORKER-URL-HERE` with that address.
5. Commit and push.

## Refresh the route and stop data

`routes/`, `stops.json` and `lines.json` are a snapshot. If STCP changes a line, regenerate them with
Node.js 20.11 or newer:

```bash
node tools/build-data.mjs
```

The script makes about 150 requests to STCP's website and takes a minute or so.

## Settings

These constants are near the top of the script in `index.html`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `STCP_PROXY` | not set | Address of the optional helper |
| `REFRESH_MS` | `10000` | How often bus positions are fetched, in milliseconds |
| `NEXT_STOPS` | `5` | How many upcoming stops get a time |
| `DEFAULT_MIN_PER_KM` | `3.5` | Pace used when there is no STCP prediction |
| `WALK_RADIUS_M` | `600` | How far from you and from the destination a stop may be |
| `WALK_M_PER_MIN` | `65` | Walking speed, as straight-line metres per minute |
| `STALE_MS` | `180000` | After this long without a report, a bus is dimmed |

## Known limits

- **Estimates only:** without the helper, times are based on distance and an average pace.
- **Direct trips only:** the trip search does not plan journeys that need a change of bus.
- **Running buses only:** a bus that has not left its first stop yet is not shown, because the
  app has no timetable.
- **Trip times are rough:** they use the average pace and straight-line walking distances.
- **Address search is rate limited:** Nominatim is a shared free service meant for light use.
- **Data can go stale:** bundled routes and stops reflect the day they were downloaded.
- **Missing routes:** line ZC has no route data on STCP's site, so following a ZC bus shows an
  error. Circular lines 300 to 303 and tram 22 have one direction only, which is used for both.
- **Buses in service only:** a bus number can be found only while that bus is running.
- **Depends on third parties:** the app stops working if Porto's open-data feed or STCP's
  website change or restrict access.

## Data and terms

Bus positions come from Porto Digital's open-data platform. Route, stop and arrivals data
comes from the service behind STCP's public website, which is not a documented open-data feed
and has no published usage terms that this project is aware of. The files in `routes/` and
`stops.json` are copies of that data. Treat this as a personal or educational project, and
check with STCP before using it for anything wider.

Map data is © OpenStreetMap contributors.
