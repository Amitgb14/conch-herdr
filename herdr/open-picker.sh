#!/bin/sh
# Opens the plugin's picker pane: a keybinding names an action, and this
# action is the way to reach the pane from one.
set -eu
exec "${HERDR_BIN_PATH:-herdr}" plugin pane open --plugin conch.sandbox --entrypoint picker
