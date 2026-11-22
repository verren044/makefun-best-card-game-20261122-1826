// Ember Sigil's renderer: one 1280x720 canvas, scaled to the window. It draws the
// title, the table (both hands, both boards, heroes, mana, log) and the win/loss
// screens, and publishes the clickable zones the input layer hit-tests.
import { CARD_BY_ID, FIELD, MAX_MANA, PALETTE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_OVER = 2;

const EL_COLOR = {
  fire: PALETTE.fire, frost: PALETTE.frost, stone: PALETTE.stone,
  thorn: PALETTE.thorn, gale: PALETTE.gale,
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sigil(ctx, el, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = EL_COLOR[el] ?? '#ccc';
  ctx.strokeStyle = EL_COLOR[el] ?? '#ccc';
  ctx.lineWidth = 2;
  if (el === 'fire') {
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.55, s * 0.7);
    ctx.quadraticCurveTo(0, s * 0.35, -s * 0.55, s * 0.7);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
    ctx.fill();
  } else if (el === 'frost') {
    for (let k = 0; k < 3; k += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
    }
  } else if (el === 'stone') {
    ctx.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const a = (Math.PI / 3) * k - Math.PI / 2;
      k === 0 ? ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s) : ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.closePath(); ctx.fill();
  } else if (el === 'thorn') {
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, s * 0.7); ctx.lineTo(-s * 0.8, s * 0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, s * 0.2); ctx.lineTo(0, s); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-s, 0);
    ctx.quadraticCurveTo(0, -s, s, 0); ctx.quadraticCurveTo(0, s, -s, 0); ctx.fill();
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line === '' ? w : `${line} ${w}`;
    if (ctx.measureText(test).width > maxW && line !== '') {
      ctx.fillText(line, x, y + lines * lineH);
      lines += 1;
      if (lines >= maxLines) return;
      line = w;
    } else line = test;
  }
  if (line !== '' && lines < maxLines) ctx.fillText(line, x, y + lines * lineH);
}

/** Every clickable rectangle for `state` on `screen`, in canvas coordinates. */
export function layoutZones(state, screen) {
  const zones = [];
  if (screen === SCREEN_TITLE) {
    zones.push({ kind: 'start', x: 490, y: 470, w: 300, h: 64 });
    return zones;
  }
  if (screen === SCREEN_OVER) {
    zones.push({ kind: 'again', x: 490, y: 500, w: 300, h: 64 });
    return zones;
  }
  const p = state.player;
  const e = state.enemy;
  const handW = 118;
  const handGap = 8;
  const handTotal = p.hand.length * handW + (p.hand.length - 1) * handGap;
  const handX = (FIELD.width - handTotal) / 2;
  p.hand.forEach((id, i) => zones.push({ kind: 'hand', index: i, x: handX + i * (handW + handGap), y: 548, w: handW, h: 158 }));
  const boardW = 112;
  const boardGap = 10;
  const bTotal = (n) => n * boardW + Math.max(0, n - 1) * boardGap;
  const bx = (n) => (FIELD.width - bTotal(n)) / 2;
  e.board.forEach((c, i) => zones.push({ kind: 'enemy-board', index: i, x: bx(e.board.length) + i * (boardW + boardGap), y: 148, w: boardW, h: 148 }));
  p.board.forEach((c, i) => zones.push({ kind: 'board', index: i, x: bx(p.board.length) + i * (boardW + boardGap), y: 372, w: boardW, h: 148 }));
  zones.push({ kind: 'enemy-hero', x: 590, y: 18, w: 100, h: 100 });
  zones.push({ kind: 'player-hero', x: 24, y: 596, w: 100, h: 100 });
  zones.push({ kind: 'end-turn', x: 1108, y: 330, w: 140, h: 52 });
  return zones;
}

function drawCardFace(ctx, def, x, y, w, h, opts = {}) {
  const el = EL_COLOR[def.el];
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#3a2f24');
  grad.addColorStop(1, '#241c15');
  ctx.fillStyle = grad;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.lineWidth = opts.selected ? 4 : 2;
  ctx.strokeStyle = opts.selected ? PALETTE.gold : (opts.canPlay === false ? '#5a4a38' : el);
  ctx.stroke();
  if (opts.dim) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
  }
  // Cost gem.
  ctx.fillStyle = PALETTE.mana;
  ctx.beginPath(); ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(def.cost), x + 16, y + 17);
  // Element sigil.
  sigil(ctx, def.el, x + w / 2, y + 52, 22);
  // Name.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold ${def.name.length > 13 ? 13 : 15}px system-ui, sans-serif`;
  ctx.fillText(def.name, x + w / 2, y + 92);
  // Rules text.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const body = def.kind === 'creature' ? (def.text || 'Creature') : def.text;
  wrapText(ctx, body, x + 10, y + 112, w - 20, 13, 2);
  if (def.kind === 'creature') {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(x + 18, y + h - 16, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1208';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(opts.atk ?? def.atk), x + 18, y + h - 15);
    ctx.fillStyle = PALETTE.hp;
    ctx.beginPath(); ctx.arc(x + w - 18, y + h - 16, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(String(opts.hp ?? def.hp), x + w - 18, y + h - 15);
  } else {
    ctx.fillStyle = el;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SPELL', x + w / 2, y + h - 16);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawHero(ctx, name, side, x, y, w, h, isPlayer, selected) {
  ctx.fillStyle = isPlayer ? PALETTE.player : PALETTE.enemy;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.lineWidth = selected ? 4 : 2;
  ctx.strokeStyle = selected ? PALETTE.gold : PALETTE.panelEdge;
  ctx.stroke();
  sigil(ctx, isPlayer ? 'gale' : 'fire', x + w / 2, y + 30, 16);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, x + w / 2, y + 58);
  ctx.fillStyle = side.hp <= 10 ? '#ff6b5e' : PALETTE.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`♥ ${Math.max(0, side.hp)}`, x + w / 2, y + 84);
  ctx.textAlign = 'left';
}

function drawMana(ctx, side, x, y) {
  for (let i = 0; i < MAX_MANA; i += 1) {
    ctx.fillStyle = i < side.mana ? PALETTE.mana : '#33414f';
    ctx.beginPath(); ctx.arc(x + i * 20, y, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`${side.mana}/${side.maxMana}`, x + MAX_MANA * 20 + 8, y + 5);
}

function drawTable(ctx, state) {
  const s = state;
  const zones = layoutZones(s, SCREEN_PLAY);
  const zone = (kind, index) => zones.find((z) => z.kind === kind && (index === undefined || z.index === index));
  // Felt.
  ctx.fillStyle = PALETTE.felt;
  rr(ctx, 24, 130, FIELD.width - 48, 410, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.feltLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Enemy hero + hand backs.
  drawHero(ctx, 'ASH HERALD', s.enemy, 590, 18, 100, 100, false, s.targeting !== null);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Herald's hand: ${s.enemy.hand.length} cards · deck ${s.enemy.deck.length}`, 24, 40);
  for (let i = 0; i < Math.min(s.enemy.hand.length, 7); i += 1) {
    ctx.fillStyle = PALETTE.cardBack;
    rr(ctx, 24 + i * 34, 58, 28, 40, 5);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 1; ctx.stroke();
  }
  drawMana(ctx, s.enemy, 940, 70);
  // Enemy board.
  s.enemy.board.forEach((c, i) => {
    const z = zone('enemy-board', i);
    const def = c.def;
    drawCardFace(ctx, def, z.x, z.y, z.w, z.h, { atk: c.atk, hp: c.hp, selected: s.targeting !== null, dim: false });
    if (def.guard) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GUARD', z.x + z.w / 2, z.y - 6);
      ctx.textAlign = 'left';
    }
  });
  // Log.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(s.log[s.log.length - 1] ?? '', 40, 330);
  // Turn + end turn.
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`Turn ${s.turn}`, 40, 356);
  const et = zone('end-turn');
  const canEnd = s.phase === 'player';
  ctx.fillStyle = canEnd ? PALETTE.gold : '#5a4a38';
  rr(ctx, et.x, et.y, et.w, et.h, 10);
  ctx.fill();
  ctx.fillStyle = canEnd ? '#1a1208' : PALETTE.muted;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.phase === 'ai' ? 'Herald…' : 'End Turn', et.x + et.w / 2, et.y + et.h / 2 + 5);
  ctx.textAlign = 'left';
  // Player board.
  s.player.board.forEach((c, i) => {
    const z = zone('board', i);
    drawCardFace(ctx, c.def, z.x, z.y, z.w, z.h, {
      atk: c.atk, hp: c.hp, selected: s.selected?.board === i, dim: !c.canAttack,
    });
    if (!c.canAttack) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.justPlayed ? 'RESTING' : 'SPENT', z.x + z.w / 2, z.y + z.h + 14);
      ctx.textAlign = 'left';
    }
  });
  // Player hero + mana.
  drawHero(ctx, 'THE WARDEN', s.player, 24, 596, 100, 100, true, false);
  drawMana(ctx, s.player, 940, 640);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Your deck: ${s.player.deck.length} cards`, 940, 668);
  // Player hand.
  s.player.hand.forEach((id, i) => {
    const z = zone('hand', i);
    const def = CARD_BY_ID[id];
    drawCardFace(ctx, def, z.x, z.y, z.w, z.h, {
      selected: s.selected?.hand === i || s.targeting?.hand === i,
      canPlay: s.player.mana >= def.cost,
      dim: s.phase !== 'player',
    });
  });
  // Hint.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  let hint = 'Click a card to play it. Click a creature, then an enemy, to attack.';
  if (s.targeting) hint = 'Choose a target: an enemy creature or the Herald.';
  else if (s.selected?.board !== undefined) hint = 'Attacker chosen — click an enemy creature or the Herald.';
  else if (s.phase === 'ai') hint = 'The Herald is thinking…';
  ctx.fillText(hint, 40, 700);
}

function drawTitle(ctx, best) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Sigil emblem.
  sigil(ctx, 'fire', 640, 150, 70);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMBER SIGIL', 640, 270);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('A duel of cards against the Ash Herald', 640, 310);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('30 health each · mana grows every turn · Guard must be struck first', 640, 345);
  ctx.fillText('Click a card to play it, click a creature to attack. Keys 1–7 play cards, Space ends the turn.', 640, 372);
  if (best > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`Duels won: ${best}`, 640, 410);
  }
  ctx.fillStyle = PALETTE.gold;
  rr(ctx, 490, 470, 300, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#1a1208';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Begin the Duel', 640, 510);
  ctx.textAlign = 'left';
}

function drawOver(ctx, state, best) {
  ctx.fillStyle = 'rgba(10, 8, 6, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const won = state.winner === 'player';
  ctx.fillStyle = won ? PALETTE.gold : PALETTE.hp;
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', 640, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(
    won ? `The Ash Herald falls. The Sigil is yours — won in ${state.turn} turns.` : `The Herald prevails in ${state.turn} turns. The Sigil dims… for now.`,
    640, 345,
  );
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Warden ${Math.max(0, state.player.hp)} ♥ · Herald ${Math.max(0, state.enemy.hp)} ♥ · Duels won: ${best}`, 640, 380);
  ctx.fillStyle = PALETTE.gold;
  rr(ctx, 490, 500, 300, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#1a1208';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Duel Again', 640, 540);
  ctx.textAlign = 'left';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function draw(state, screen, best) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) drawTitle(ctx, best);
    else if (screen === SCREEN_OVER) { drawTable(ctx, state); drawOver(ctx, state, best); }
    else drawTable(ctx, state);
  }
  return { draw };
}
