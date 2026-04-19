# 🐍 Snake README — Setup Guide

## What you're getting
- A community Snake game that lives inside your GitHub profile README
- Players click direction buttons → a GitHub issue is auto-created → an Action processes the move in ~30s
- Your leaderboard auto-updates with players' GitHub handles — zero manual input from them
- The SVG board is committed back to your repo and renders directly in the README

---

## Step 1 — Copy files into your profile repo

Your profile repo is `senapati484/senapati484`. Copy these files into it:

```
senapati484/
├── README.md                        ← add the <!-- SNAKE_START --> section
├── game/
│   ├── state.json                   ← initial game state (copy as-is)
│   ├── leaderboard.json             ← empty array [] to start
│   └── board.svg                    ← will be generated automatically
├── scripts/
│   └── snake.js                     ← the game engine
└── .github/
    └── workflows/
        └── snake.yml                ← the GitHub Action
```

---

## Step 2 — Edit your README.md

In your existing `README.md`, paste the following block wherever you want the game to appear (usually center-bottom):

```markdown
<!-- SNAKE_START -->
<!-- SNAKE_END -->
```

The GitHub Action will fill in everything between these two comments automatically on the first run.

---

## Step 3 — Create a "snake" label in your repo

The Action filters issues using a label called `snake` so only snake moves trigger it.

1. Go to `github.com/senapati484/senapati484/labels`
2. Click **New label**
3. Name: `snake`, Color: `#39d353`, Description: `Snake game move`

---

## Step 4 — Give Actions write permission

By default the `GITHUB_TOKEN` can't push commits. Fix it:

1. Go to your repo → **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Click **Save**

---

## Step 5 — Push and trigger the first run

```bash
git add .
git commit -m "feat: add community snake game"
git push
```

Then manually trigger the first board generation — open an issue titled exactly:

```
snake|new
```

The Action will run, generate `game/board.svg`, fill in the README, and close the issue. Done!

---

## How it works (for the curious)

```
Visitor clicks "▲ UP" button in your README
         ↓
Opens a pre-filled GitHub issue:  title = "snake|move|up"
         ↓
GitHub Action triggers (on: issues.opened)
         ↓
Reads  github.event.issue.user.login  →  their GitHub handle (automatic!)
         ↓
node scripts/snake.js  processes the move
         ↓
If food eaten → handle gets +10 in leaderboard.json
         ↓
New board.svg generated + README patched
         ↓
Committed back to repo → README updates live
         ↓
Issue auto-closed + thank-you comment posted to the visitor
```

---

## Resetting the game

If the snake dies, a **🎮 NEW GAME** button appears automatically in the README. Anyone can click it to restart.

To manually reset, open an issue titled:
```
snake|new
```

---

## Customisation

| What | Where | How |
|------|-------|-----|
| Board size | `scripts/snake.js` | Change `ROWS` and `COLS` constants |
| Points per food | `scripts/snake.js` | Change `addScore(lb, player, 10)` — the `10` |
| Leaderboard size | `scripts/snake.js` | Change `.slice(0, 5)` to show more/fewer rows |
| Board colors | `scripts/snake.js` | Edit hex colors in `generateSVG()` |
