# conch sandboxes for herdr

Make a cloud sandbox from inside herdr, with your branch checked out, and
work in it as a herdr machine. Sleep, wake or delete it from the same
place. Daytona, Hetzner Cloud, InstaBox, DigitalOcean and the other
providers conch knows with ssh.

Two pieces, one for each herdr:

| | For | Folder | Install |
| --- | --- | --- | --- |
| Plugin | herdr in the terminal (0.9.3 or later) | [`herdr/`](herdr) | `herdr plugin install Amitgb14/conch-herdr/herdr` |
| Mod | the herdr desktop app | [`mods/conch-sandbox/`](mods/conch-sandbox) | see [RECIPE.md](RECIPE.md) |

Both run **conch-sandbox**, a small program built from
[conch](https://github.com/Amitgb14/conch)'s provider code. You don't need
conch. The launcher next to each (`conch-sandbox.sh`) fetches the version it
pins, checks its sha256, and keeps it under
`~/.local/share/conch-sandbox/<version>/`. If you have conch, both share its
keys and settings, and `conch sandbox stats` shows these sandboxes and what
they cost.

## Before you start

A provider API key, in your environment (`HCLOUD_TOKEN`,
`DAYTONA_API_KEY`, `INSTABOX_API_KEY`…), or saved once:

```sh
sh herdr/conch-sandbox.sh key set daytona    # reads the key from stdin
```

The first sandbox adds one line to the top of `~/.ssh/config`:
`Include ~/.config/conch/ssh/config`. That is how herdr reaches it by name.

## herdr (terminal)

```sh
herdr plugin install Amitgb14/conch-herdr/herdr
```

Bind the picker in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "prefix+alt+s"
type = "plugin_action"
command = "conch.sandbox.new"
description = "new sandbox"
```

The picker lists the providers you have a key for, then makes the sandbox,
clones the shown workspace's repo at its branch and commit (push it
first), runs `herdr machine add`, and opens a workspace in the checkout.
On a workspace on a sandbox, the actions `conch.sandbox.sleep`, `.wake`
and `.delete` do what they say. Closing a workspace tells you when a
sandbox nobody uses is still running.

## herdr app

Install with the recipe in [RECIPE.md](RECIPE.md), then run
`mod.open {name: "conch-sandbox"}` from the palette or a key. On a space
that is on a sandbox, the same dialog offers Sleep, Wake and Delete.

## Status

Early. The plugin manifest passes herdr's own check (`test/test.sh`). The
app mod has not yet been run in the herdr app: its API changes weekly.

## Development

```sh
scripts/sync-launcher.sh ~/workspace/conch   # copy the launcher from a conch checkout
sh test/test.sh
herdr plugin link "$PWD/herdr"               # try the plugin locally
```

Apache-2.0.
