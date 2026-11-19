# conch-sandbox — a Herdr app mod

Make a cloud sandbox for the shown space's repo and open it as a machine;
sleep, wake or delete it later from the same dialog.

## Install

1. Copy `mods/conch-sandbox/` from this repository to
   `~/.config/herdr-app/mods/conch-sandbox/`.
2. Check it: `herdr-app check ~/.config/herdr-app/mods/conch-sandbox`.
3. Bind a key in `~/.config/herdr-app/keys.json`, under `global` (pick a
   free one; this repository's `keys.json` has an example):

   ```json
   "cmd-alt-s": { "command": "mod.open", "args": { "name": "conch-sandbox" } }
   ```

4. Have a provider API key in your environment, or run
   `sh ~/.config/herdr-app/mods/conch-sandbox/conch-sandbox.sh key set PROVIDER`
   once (Herdr started from the Dock doesn't see shell variables).

The first time it opens it fetches conch-sandbox (a few MB) and shows
"Getting ready…".

Tested with: not yet run in the Herdr app.
