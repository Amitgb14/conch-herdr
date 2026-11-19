#!/bin/sh
# Checks what can be checked without a real herdr session or a provider:
# the plugin manifest (herdr's own validator, in a throwaway HOME), shell
# syntax, the mod's JavaScript syntax, and that the two launcher copies match.
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
fail=0
ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }

for f in "$here"/herdr/*.sh "$here"/mods/conch-sandbox/*.sh "$here"/scripts/*.sh; do
	[ -f "$f" ] || continue
	if sh -n "$f"; then ok "sh -n $(basename "$f")"; else bad "sh -n $f"; fi
done

if command -v node >/dev/null 2>&1; then
	tmp=$(mktemp -d)
	cp "$here/mods/conch-sandbox/main.js" "$tmp/main.mjs"
	if node --check "$tmp/main.mjs"; then ok "node --check main.js"; else bad "node --check main.js"; fi
	rm -rf "$tmp"
else
	echo "skip node --check (no node)"
fi

a="$here/herdr/conch-sandbox.sh"; b="$here/mods/conch-sandbox/conch-sandbox.sh"
if [ -f "$a" ] && [ -f "$b" ]; then
	if cmp -s "$a" "$b"; then ok "launcher copies match"; else bad "launcher copies differ: run scripts/sync-launcher.sh"; fi
else
	bad "launcher missing: run scripts/sync-launcher.sh PATH_TO_CONCH"
fi

# herdr validates the manifest when linking. A throwaway HOME and no socket
# keep it away from the person's real herdr.
if command -v herdr >/dev/null 2>&1; then
	home=$(mktemp -d)
	if env -u HERDR_SOCKET_PATH -u HERDR_ENV HOME="$home" XDG_CONFIG_HOME="$home/.config" XDG_DATA_HOME="$home/.local/share" XDG_STATE_HOME="$home/.local/state" \
		herdr plugin link "$here/herdr" >"$home/out" 2>&1; then
		ok "herdr plugin link (manifest valid)"
	else
		bad "herdr plugin link: $(cat "$home/out")"
	fi
	rm -rf "$home"
else
	echo "skip herdr manifest check (no herdr)"
fi

exit $fail
