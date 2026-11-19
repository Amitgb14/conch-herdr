// conch sandboxes for the Herdr app: one dialog to make a cloud sandbox for
// the shown space's repo and open it as a machine, and, when the shown space
// is already on one, to sleep, wake or delete it.
//
// Open it with the command `mod.open {name: "conch-sandbox"}` (bind a key to
// it in keys.json, or run it from the palette). Everything slow runs through
// conch-sandbox, fetched on first use by the launcher next to this file.
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, hc, run, spaces, focused, theme, appHome, props, closeOverlay, notify } from "herdr";

const TEN_MINUTES = 600000;

function launcher() {
  return `${appHome()}/mods/conch-sandbox/conch-sandbox.sh`;
}

// Runs conch-sandbox through the launcher; resolves with parsed JSON when
// asked, else the raw result. A non-zero exit rejects with its stderr.
async function sandbox(args, { json = false, timeout = 60000 } = {}) {
  const r = await exec("sh", [launcher(), ...args], { timeout });
  if (r.code !== 0) {
    const why = (r.stderr || r.stdout || "").trim().split("\n").pop();
    throw new Error(why || `conch-sandbox ${args[0]} failed (${r.code})`);
  }
  return json ? JSON.parse(r.stdout) : r;
}

function shownSpace() {
  const f = focused();
  return spaces().find((s) => (f ? s.id === f.space : s.active)) ?? null;
}

export default class ConchSandbox extends View {
  init(_props, cx) {
    this.phase = "loading"; // loading | pick | working | done | error
    this.message = "Getting ready…";
    this.providers = [];
    this.orphans = [];
    this.pick = 0;
    this.size = {};
    this.space = shownSpace();
    // A space on one of our machines: offer its actions instead.
    this.mine = this.space?.machine?.startsWith("conch-") ? this.space.machine : null;
    cx.spawn(async (cx) => {
      try {
        const [providers, orphans] = await Promise.all([
          sandbox(["providers", "--json"], { json: true, timeout: TEN_MINUTES }),
          sandbox(["orphans", "--tool", "herdr-app", "--json"], { json: true }).catch(() => []),
        ]);
        this.providers = providers.filter((p) => p.capabilities?.ssh);
        this.orphans = orphans;
        this.pick = Math.max(0, this.providers.findIndex((p) => p.ready));
        this.phase = "pick";
      } catch (e) {
        this.fail(e);
      }
      cx.notify();
    });
  }

  fail(e) {
    this.phase = "error";
    this.message = String(e.message ?? e);
  }

  close_dialog() {
    const id = props().overlay;
    if (id) closeOverlay(id);
  }

  // The shown space's repo, branch and commit, read where its folder is.
  async repoOf(space) {
    const git = (args) => exec("git", args, { cwd: space.folder, on: space.machine });
    const [url, branch, ref] = await Promise.all([
      git(["remote", "get-url", "origin"]),
      git(["branch", "--show-current"]),
      git(["rev-parse", "HEAD"]),
    ]);
    if (url.code !== 0) throw new Error("This space's folder has no origin remote to clone.");
    return { url: url.stdout.trim(), branch: branch.stdout.trim(), ref: ref.stdout.trim() };
  }

  create(cx) {
    const p = this.providers[this.pick];
    if (!p?.ready) return;
    this.phase = "working";
    this.message = `Creating a ${p.label} sandbox…`;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const space = this.space;
        const repo = space?.folder ? await this.repoOf(space) : null;
        const name = repo?.branch || space?.name || "sandbox";
        const args = ["create", "--provider", p.name, "--name", name, "--json", "--yes", "--tool", "herdr-app"];
        if (repo) args.push("--repo", repo.url, "--branch", repo.branch, "--ref", repo.ref);
        if (this.size[p.name]) args.push("--size", this.size[p.name]);
        const box = await sandbox(args, { json: true, timeout: TEN_MINUTES });
        this.message = `Adding ${box.ssh.alias}…`;
        cx.notify();
        const added = await hc(["machine", "add", box.ssh.alias, "--json"]);
        if (added.code !== 0) {
          throw new Error(`The sandbox is up, but Herdr couldn't add it: run hc machine add ${box.ssh.alias} in a terminal.`);
        }
        run("space.new", { machine: box.ssh.alias, folder: box.project_root, name: `${p.label} ${name}` });
        this.phase = "done";
        this.close_dialog();
      } catch (e) {
        this.fail(e);
      }
      cx.notify();
    });
  }

  act(verb, cx) {
    const alias = this.mine;
    this.phase = "working";
    this.message = { stop: "Putting it to sleep…", start: "Waking it…", rm: "Deleting it…" }[verb];
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await sandbox([verb, "--machine", alias], { timeout: TEN_MINUTES });
        if (verb === "rm") await hc(["machine", "rm", alias]).catch(() => null);
        notify({ title: alias, body: { stop: "Asleep. Its disk is kept.", start: "Awake.", rm: "Deleted. It no longer bills." }[verb] });
        this.close_dialog();
      } catch (e) {
        this.fail(e);
      }
      cx.notify();
    });
  }

  forget(orphan, cx) {
    cx.spawn(async (cx) => {
      try {
        await sandbox(["rm", "--provider", orphan.provider, orphan.id], { timeout: TEN_MINUTES });
        this.orphans = this.orphans.filter((o) => o !== orphan);
      } catch (e) {
        this.fail(e);
      }
      cx.notify();
    });
  }

  button(id, label, t, onClick, primary = false) {
    return div().id(id).px(12).py(6).rounded(6).border(1)
      .border_color(primary ? t.solid : t.border)
      .bg(primary ? t.solid : t.surface)
      .text_color(primary ? t.solid_foreground : t.foreground)
      .hover((s) => s.bg(primary ? t.accent : t.hover))
      .on_click((_e, cx) => onClick(cx))
      .child(label);
  }

  render(cx) {
    const t = theme();
    const body = v_flex().w(420).p(16).gap(12).bg(t.popover).text_size(13).text_color(t.foreground);
    const title = div().font_semibold().text_size(14);

    if (this.mine && this.phase !== "error" && this.phase !== "working") {
      return body
        .child(title.child(this.mine))
        .child(div().text_color(t.muted).child("A conch sandbox. Sleeping keeps its disk; deleting ends its billing."))
        .child(h_flex().gap(8).justify_end()
          .child(this.button("sleep", "Sleep", t, (cx) => this.act("stop", cx)))
          .child(this.button("wake", "Wake", t, (cx) => this.act("start", cx)))
          .child(this.button("delete", "Delete…", t, (cx) => this.act("rm", cx))));
    }

    if (this.phase === "loading" || this.phase === "working") {
      return body.child(title.child("New sandbox"))
        .child(h_flex().gap(8).items_center()
          .child(div().frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90))
          .child(div().text_color(t.muted).child(this.message)));
    }

    if (this.phase === "error") {
      return body.child(title.child("Couldn't finish"))
        .child(div().text_color(t.blocked).child(this.message))
        .child(h_flex().justify_end().child(this.button("close", "Close", t, () => this.close_dialog())));
    }

    const rows = this.providers.map((p, i) =>
      h_flex().id(`p-${p.name}`).justify_between().px(10).py(6).rounded(6)
        .bg(i === this.pick ? t.selected : t.popover)
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => { this.pick = i; cx.notify(); })
        .child(div().text_color(p.ready ? t.foreground : t.dim).child(p.label))
        .child(div().text_color(t.dim).text_size(12).child(p.ready ? (this.size[p.name] ?? p.sizes?.[0] ?? "") : (p.why || "no key"))));

    const chosen = this.providers[this.pick];
    const sizes = chosen?.sizes ?? [];
    const sizeRow = sizes.length < 2 ? null : h_flex().gap(6).children(sizes.map((s) =>
      div().id(`s-${s}`).px(8).py(3).rounded(5).border(1).border_color(t.border)
        .bg((this.size[chosen.name] ?? sizes[0]) === s ? t.selected : t.popover)
        .on_click((_e, cx) => { this.size[chosen.name] = s; cx.notify(); })
        .child(s)));

    const orphans = this.orphans.length === 0 ? null : v_flex().gap(4)
      .child(div().text_color(t.muted).text_size(12).child("Still running, not in Herdr"))
      .children(this.orphans.map((o) => h_flex().justify_between()
        .child(div().child(o.name))
        .child(this.button(`rm-${o.id}`, "Delete", t, (cx) => this.forget(o, cx)))));

    const where = this.space?.folder ? `${this.space.name} · ${this.space.branch ?? ""}` : "no repo: an empty sandbox";
    return body
      .child(title.child("New sandbox"))
      .child(div().text_color(t.muted).text_size(12).child(where))
      .when(orphans !== null, (el) => el.child(orphans))
      .child(v_flex().gap(2).children(rows))
      .when(sizeRow !== null, (el) => el.child(sizeRow))
      .child(div().text_color(t.dim).text_size(12)
        .child("The first sandbox adds one Include line to ~/.ssh/config, so Herdr can reach it."))
      .child(h_flex().gap(8).justify_end()
        .child(this.button("cancel", "Cancel", t, () => this.close_dialog()))
        .child(this.button("create", "Create", t, (cx) => this.create(cx), true)));
  }
}
