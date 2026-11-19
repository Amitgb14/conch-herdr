#!/bin/sh
# Copies conch-sandbox's launcher from a conch checkout into the plugin and
# the mod, so both pin the same version and checksums.
#   scripts/sync-launcher.sh ~/workspace/conch
set -eu
src="${1:?usage: scripts/sync-launcher.sh PATH_TO_CONCH_CHECKOUT}/scripts/conch-sandbox.sh"
[ -f "$src" ] || { echo "no launcher at $src" >&2; exit 1; }
here=$(cd "$(dirname "$0")/.." && pwd)
for dst in "$here/herdr/conch-sandbox.sh" "$here/mods/conch-sandbox/conch-sandbox.sh"; do
	cp "$src" "$dst"
	chmod 755 "$dst"
done
grep -m1 '^want=' "$src" | sed 's/^/pinned /'
