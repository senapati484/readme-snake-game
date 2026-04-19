const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT          = path.join(__dirname, '..');
const STATE_PATH    = path.join(ROOT, 'game/state.json');
const LB_PATH       = path.join(ROOT, 'game/leaderboard.json');
const SVG_PATH      = path.join(ROOT, 'game/board.svg');
const README_PATH   = path.join(ROOT, 'README.md');

// ── Board config ─────────────────────────────────────────────────────────────
const COLS      = 12;
const ROWS      = 12;
const CELL      = 38;
const PAD       = 14;
const FOOTER    = 36;
const SVG_W     = COLS * CELL + PAD * 2;
const SVG_H     = ROWS * CELL + PAD * 2 + FOOTER;

// ── Direction map ─────────────────────────────────────────────────────────────
const DIR_DELTA = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] };
const OPPOSITE  = { up:'down', down:'up', left:'right', right:'left' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function rndFood(snake) {
  let pos;
  const occupied = new Set(snake.map(([r,c]) => `${r},${c}`));
  do {
    pos = [Math.floor(Math.random()*ROWS), Math.floor(Math.random()*COLS)];
  } while (occupied.has(`${pos[0]},${pos[1]}`));
  return pos;
}

function initState() {
  const snake = [[6,6],[6,5],[6,4]];
  return {
    snake,
    food:       rndFood(snake),
    direction:  'right',
    score:      0,
    status:     'active',   // 'active' | 'dead'
    lastPlayer: null,
    totalMoves: 0,
  };
}

// ── Game logic ────────────────────────────────────────────────────────────────
function applyMove(state, dir, player) {
  if (state.status !== 'active') return { state, ate: false };

  // Block 180-degree reversal
  const resolvedDir = OPPOSITE[dir] === state.direction ? state.direction : dir;
  const [dr, dc]    = DIR_DELTA[resolvedDir];
  const [hr, hc]    = state.snake[0];
  const newHead     = [hr + dr, hc + dc];
  const [nr, nc]    = newHead;

  // Wall collision
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
    return { state: { ...state, status: 'dead', lastPlayer: player }, ate: false };
  }

  // Self collision
  const bodySet = new Set(state.snake.map(([r,c]) => `${r},${c}`));
  if (bodySet.has(`${nr},${nc}`)) {
    return { state: { ...state, status: 'dead', lastPlayer: player }, ate: false };
  }

  const ate       = nr === state.food[0] && nc === state.food[1];
  const newSnake  = [newHead, ...state.snake];
  if (!ate) newSnake.pop();

  return {
    state: {
      ...state,
      snake:      newSnake,
      food:       ate ? rndFood(newSnake) : state.food,
      direction:  resolvedDir,
      score:      ate ? state.score + 10 : state.score,
      lastPlayer: player,
      totalMoves: state.totalMoves + 1,
    },
    ate,
  };
}

// ── SVG renderer ──────────────────────────────────────────────────────────────
function generateSVG(state) {
  const { snake, food, score, status, totalMoves } = state;
  const headSet = `${snake[0][0]},${snake[0][1]}`;
  const bodySet = new Set(snake.slice(1).map(([r,c]) => `${r},${c}`));
  const foodKey = `${food[0]},${food[1]}`;

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x   = PAD + c * CELL;
      const y   = PAD + r * CELL;
      const key = `${r},${c}`;
      const isHead = key === headSet;
      const isBody = bodySet.has(key);
      const isFood = key === foodKey;

      // Background cell
      cells.push(`<rect x="${x+1}" y="${y+1}" width="${CELL-2}" height="${CELL-2}" rx="5" fill="${isHead ? '#39d353' : isBody ? '#26a641' : isFood ? '#161b22' : '#0d1117'}"/>`);

      // Food — apple style
      if (isFood) {
        const cx = x + CELL/2;
        const cy = y + CELL/2;
        cells.push(`<circle cx="${cx}" cy="${cy}" r="${CELL*0.28}" fill="#ff4444"/>`);
        cells.push(`<rect x="${cx-1}" y="${y+5}" width="2" height="7" rx="1" fill="#26a641"/>`);
      }

      // Snake head — add eyes
      if (isHead) {
        const [dr, dc] = DIR_DELTA[state.direction];
        const eyeOff = CELL * 0.18;
        const eyeFwd = CELL * 0.22;
        const bx = x + CELL/2;
        const by = y + CELL/2;
        // Two eyes perpendicular to direction
        const e1 = [bx + dc*eyeFwd - dr*eyeOff, by + dr*eyeFwd + dc*eyeOff];
        const e2 = [bx + dc*eyeFwd + dr*eyeOff, by + dr*eyeFwd - dc*eyeOff];
        cells.push(`<circle cx="${e1[0]}" cy="${e1[1]}" r="3" fill="#0d1117"/>`);
        cells.push(`<circle cx="${e2[0]}" cy="${e2[1]}" r="3" fill="#0d1117"/>`);
      }
    }
  }

  const statusText = status === 'dead'
    ? `💀 GAME OVER  ·  Score: ${score}`
    : `Score: ${score}  ·  Moves: ${totalMoves}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}">
  <rect width="${SVG_W}" height="${SVG_H}" fill="#010409"/>
  <rect x="${PAD-4}" y="${PAD-4}" width="${COLS*CELL+8}" height="${ROWS*CELL+8}" rx="8" fill="none" stroke="${status==='dead'?'#ff4444':'#39d353'}" stroke-width="1.5" opacity="0.6"/>
  ${cells.join('\n  ')}
  <text x="${SVG_W/2}" y="${PAD + ROWS*CELL + FOOTER/2 + 6}" text-anchor="middle" fill="#7d8590" font-family="monospace" font-size="13">${statusText}</text>
</svg>`;
}

// ── Leaderboard helpers ───────────────────────────────────────────────────────
function addScore(lb, handle, pts) {
  const entry = lb.find(e => e.handle === handle);
  if (entry) { entry.score += pts; entry.moves = (entry.moves||0) + 1; }
  else        { lb.push({ handle, score: pts, moves: 1 }); }
  return lb.sort((a,b) => b.score - a.score);
}

// ── README section generator ──────────────────────────────────────────────────
const REPO = 'senapati484/senapati484';
const BASE = `https://github.com/${REPO}/issues/new`;

function issueLink(title, label) {
  return `${BASE}?title=${encodeURIComponent(title)}&labels=snake&body=.`;
}

function generateSection(state, lb) {
  const alive = state.status === 'active';

  const dirButtons = alive
    ? `<p align="center">
<a href="${issueLink('snake|move|up')}"><img src="https://img.shields.io/badge/▲_UP-0d1117?style=for-the-badge&color=161b22&labelColor=161b22&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzM5ZDM1MyIgZD0iTTEyIDhsLTYgNmgxMnoiLz48L3N2Zz4=" alt="UP"/></a>
</p>
<p align="center">
<a href="${issueLink('snake|move|left')}"><img src="https://img.shields.io/badge/◀_LEFT-161b22?style=for-the-badge" alt="LEFT"/></a>
&nbsp;&nbsp;
<a href="${issueLink('snake|move|down')}"><img src="https://img.shields.io/badge/▼_DOWN-161b22?style=for-the-badge" alt="DOWN"/></a>
&nbsp;&nbsp;
<a href="${issueLink('snake|move|right')}"><img src="https://img.shields.io/badge/RIGHT_▶-161b22?style=for-the-badge" alt="RIGHT"/></a>
</p>`
    : `<p align="center">
<a href="${issueLink('snake|new')}"><img src="https://img.shields.io/badge/🎮_NEW_GAME-ff4444?style=for-the-badge&color=ff4444" alt="New Game"/></a>
</p>`;

  const top5 = lb.slice(0, 5);
  const rows = top5.length === 0
    ? '| — | *No scores yet — be the first!* | — |'
    : top5.map((e, i) => {
        const medal = ['🥇','🥈','🥉','4️⃣','5️⃣'][i];
        return `| ${medal} | [@${e.handle}](https://github.com/${e.handle}) | **${e.score}** |`;
      }).join('\n');

  return `## 🐍 Community Snake Game

> Click a direction to move the snake — your GitHub handle is captured automatically, no sign-in needed!

<p align="center">
  <img src="game/board.svg" alt="Snake Game Board"/>
</p>

${dirButtons}

<sub>↑ Each click opens a pre-filled GitHub issue — just submit it and the bot processes your move within ~30 seconds.</sub>

---

## 🏆 Leaderboard

| Rank | Player | Score |
|:----:|--------|------:|
${rows}

<sub>Eating food = +10 pts per player. Scores are cumulative across all games.</sub>`;
}

// ── README patcher ─────────────────────────────────────────────────────────────
function patchReadme(section) {
  const START = '<!-- SNAKE_START -->';
  const END   = '<!-- SNAKE_END -->';
  let md = fs.readFileSync(README_PATH, 'utf8');
  const si = md.indexOf(START);
  const ei = md.indexOf(END);

  if (si === -1 || ei === -1) {
    md += `\n\n${START}\n${section}\n${END}\n`;
  } else {
    md = md.slice(0, si + START.length) + '\n' + section + '\n' + md.slice(ei);
  }
  fs.writeFileSync(README_PATH, md);
}

// ── Main ───────────────────────────────────────────────────────────────────────
(function main() {
  const rawAction = (process.env.SNAKE_ACTION || '').trim().toLowerCase();
  const player    = (process.env.SNAKE_PLAYER || 'anonymous').trim();

  let state = fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
    : initState();

  let lb = fs.existsSync(LB_PATH)
    ? JSON.parse(fs.readFileSync(LB_PATH, 'utf8'))
    : [];

  if (rawAction === 'new' || state.status === 'dead') {
    console.log(`Starting new game for @${player}`);
    state = initState();
  } else if (rawAction.startsWith('move|')) {
    const dir = rawAction.split('|')[1];
    if (!DIR_DELTA[dir]) { console.log(`Unknown direction: ${dir}`); process.exit(0); }

    const result = applyMove(state, dir, player);
    state = result.state;

    if (result.ate) {
      console.log(`@${player} ate food! +10 pts`);
      lb = addScore(lb, player, 10);
    }
    if (state.status === 'dead') {
      console.log(`@${player}'s move ended the game. Score: ${state.score}`);
    }
  }

  // Ensure output dir exists
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });

  fs.writeFileSync(STATE_PATH,  JSON.stringify(state, null, 2));
  fs.writeFileSync(LB_PATH,     JSON.stringify(lb,    null, 2));
  fs.writeFileSync(SVG_PATH,    generateSVG(state));

  if (fs.existsSync(README_PATH)) {
    patchReadme(generateSection(state, lb));
    console.log('README updated.');
  } else {
    console.log('README.md not found — skipping patch. Run from repo root.');
  }

  console.log(`Done. Status=${state.status} Score=${state.score}`);
})();
