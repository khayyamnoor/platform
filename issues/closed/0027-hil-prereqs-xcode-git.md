# 0027 — HIL pre-req: accept Xcode license so `git` works

- **Status**: DONE
- **Type**: HIL
- **Blocked-by**: none
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why HIL

`/usr/bin/git` on macOS is a stub that requires the Xcode Command Line Tools license to be accepted. The acceptance prompt is interactive and requires `sudo`, which Claude Code cannot do unattended. Until accepted, every `git` invocation prints:

```
You have not agreed to the Xcode license agreements. Please run 'sudo xcodebuild -license' from within a Terminal window to review and agree to the Xcode and Apple SDKs license.
```

This blocks the Ralph loop from making commits.

## Goal

`git status` runs without the Xcode license error.

## Steps (user runs these once)

```bash
sudo xcodebuild -license
# (read, then type "agree")

git --version           # should print git version cleanly
cd /Users/mukhtarahmad/Desktop/Platform
git init
git add .
git commit -m "0002: repo bootstrap (Turborepo + pnpm + Coinbase platform skeleton)"
```

After that single commit lands, the Ralph loop can take over for issue 0003 onward.

## Definition of done

- `git --version` exits 0 with no Xcode complaint.
- `git log` in `/Users/mukhtarahmad/Desktop/Platform/` shows at least one commit.
- This issue is moved to `closed/`.
