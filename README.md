# Katalog

A training log for lifting, climbing, max hangs and tendon work, built to live on a phone's home screen.
It plans each session from your own logs (top sets, back-offs, accessories, pull-ups, hangs, wrist work, limit
bouldering) and explains every rule, with its evidence, on the Method tab.

**Open it:** https://katalog.drwooodz.workers.dev/ (Cloudflare; every push to `main` deploys it)

- Works offline after the first visit, and installs to the home screen (Share → Add to Home Screen on iPhone;
  menu → Install app on Android).
- Your data stays on your device (IndexedDB). Setup → Backup saves a JSON file you can restore anywhere, including
  the original Send Log artifact.
- No build step and no dependencies: plain ES modules served as static files.

## Develop

```
python3 -m http.server 8000      # then open http://localhost:8000
npm test                         # Node 22+, no install
```

See `CLAUDE.md` for the file map and house rules. MIT licensed. The pose model in `pose/` is Google's MoveNet Thunder
(Apache 2.0).
