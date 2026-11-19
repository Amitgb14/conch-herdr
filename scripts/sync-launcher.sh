#!/bin/sh
# Copies conch-sandbox's launcher into the plugin and the mod, so both pin
# the same version and checksums. Give it a release's conch-sandbox.sh (from
# the GitHub release, or dist/ after `make sandbox-release`), or a conch
# checkout: its dist/conch-sandbox.sh is used when there is one, else the
# repo copy, whose pins stay empty until a release fills them.
#   scripts/sync-launcher.sh ~/Downloads/conch-sandbox.sh
#   scripts/sync-launcher.sh ~/workspace/conch
set -eu
arg="${1:?usage: scripts/sync-launcher.sh RELEASE_LAUNCHER_OR_CONCH_CHECKOUT}"
if [ -f "$arg" ]; then src=$arg
elif [ -f "$arg/dist/conch-sandbox.sh" ]; then src=$arg/dist/conch-sandbox.sh
elif [ -f "$arg/scripts/conch-sandbox.sh" ]; then
	src=$arg/scripts/conch-sandbox.sh
	echo "warning: $src is the repo copy; its version and hashes are empty until a release" >&2
else echo "no launcher at $arg" >&2; exit 1; fi
here=$(cd "$(dirname "$0")/.." && pwd)
for dst in "$here/herdr/conch-sandbox.sh" "$here/mods/conch-sandbox/conch-sandbox.sh"; do
	cp "$src" "$dst"
	chmod 755 "$dst"
done
grep -m1 '^want=' "$src" | sed 's/^/pinned /'
