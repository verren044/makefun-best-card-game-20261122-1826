// Ember Sigil's rules: turns, mana, drawing, playing cards, combat, Guard and Swift,
// and the AI that plays the Herald. All state changes go through here so the
// screenshot scenes can play real games forward from a fresh world.
import {
  CARD_BY_ID, DECK_LIST, HERO_HP, MAX_BOARD, MAX_HAND, MAX_MANA, START_HAND,
} from './config.js';

export const EVENT_PLAY = 1;
export const EVENT_ATTACK = 2;
export const EVENT_SPELL = 4;
export const EVENT_TURN = 8;
export const EVENT_OVER = 16;
export const EVENT_INVALID = 32;

function makeSide(random) {
  const deck = [...DECK_LIST];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    hp: HERO_HP, mana: 0, maxMana: 0, deck, hand: [], board: [], fatigue: 0,
  };
}

function drawCard(side) {
  if (side.deck.length === 0) {
    side.fatigue += 1;
    side.hp -= side.fatigue;
    return 'fatigue';
  }
  const card = side.deck.pop();
  if (side.hand.length >= MAX_HAND) return 'burned';
  side.hand.push(card);
  return 'drew';
}

function startTurn(world, side) {
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  for (const c of side.board) {
    c.canAttack = true;
    c.justPlayed = false;
  }
  drawCard(side);
  checkOver(world);
}

function otherOf(world, side) {
  return side === world.state.player ? world.state.enemy : world.state.player;
}

function checkOver(world) {
  const s = world.state;
  if (s.player.hp <= 0 && s.enemy.hp <= 0) s.winner = 'player';
  else if (s.player.hp <= 0) s.winner = 'enemy';
  else if (s.enemy.hp <= 0) s.winner = 'player';
  else return false;
  s.phase = 'over';
  return true;
}

function sweepDead(side) {
  side.board = side.board.filter((c) => c.hp > 0);
}

function log(world, msg) {
  const s = world.state;
  s.log.push(msg);
  if (s.log.length > 4) s.log.shift();
}

/** Play the card at `handIdx` of `side`. `target` names the spell's target. */
export function playCard(world, side, handIdx, target) {
  const s = world.state;
  if (s.phase === 'over') return EVENT_INVALID;
  const foe = otherOf(world, side);
  const id = side.hand[handIdx];
  if (id === undefined) return EVENT_INVALID;
  const def = CARD_BY_ID[id];
  if (side.mana < def.cost) return EVENT_INVALID;
  if (def.kind === 'creature' && side.board.length >= MAX_BOARD) return EVENT_INVALID;
  if (def.id === 'spark-bolt') {
    if (!target?.hero && (target?.board === undefined || !foe.board[target.board])) return EVENT_INVALID;
  }
  side.mana -= def.cost;
  side.hand.splice(handIdx, 1);
  if (def.kind === 'creature') {
    side.board.push({
      def, atk: def.atk, hp: def.hp, canAttack: !!def.swift, justPlayed: !def.swift,
    });
    log(world, `${side === s.player ? 'You' : 'Herald'} played ${def.name}.`);
    return EVENT_PLAY;
  }
  if (def.id === 'spark-bolt') {
    if (target?.hero) foe.hp -= def.dmg;
    else if (target?.board !== undefined && foe.board[target.board]) foe.board[target.board].hp -= def.dmg;
    else return EVENT_INVALID;
    sweepDead(foe);
    log(world, `Spark Bolt dealt ${def.dmg} damage.`);
  } else if (def.id === 'mending-light') {
    side.hp = Math.min(HERO_HP, side.hp + def.heal);
    log(world, `${side === s.player ? 'You' : 'Herald'} healed ${def.heal}.`);
  } else if (def.id === 'sigil-insight') {
    drawCard(side);
    drawCard(side);
    log(world, `${side === s.player ? 'You' : 'Herald'} drew 2 cards.`);
  } else if (def.id === 'flame-wave') {
    for (const c of foe.board) c.hp -= def.dmg;
    sweepDead(foe);
    log(world, `Flame Wave scorched the enemy board.`);
  } else if (def.id === 'ember-surge') {
    foe.hp -= def.dmg;
    log(world, `Ember Surge hit the enemy hero for ${def.dmg}.`);
  }
  checkOver(world);
  return EVENT_SPELL;
}

/** Creature `boardIdx` of `side` attacks: `target` is {hero:true} or {board:j}. */
export function attack(world, side, boardIdx, target) {
  const s = world.state;
  if (s.phase === 'over') return EVENT_INVALID;
  const foe = otherOf(world, side);
  const c = side.board[boardIdx];
  if (!c || !c.canAttack) return EVENT_INVALID;
  const guards = foe.board.filter((g) => g.def.guard);
  if (target?.hero) {
    if (guards.length > 0) return EVENT_INVALID;
    foe.hp -= c.atk;
    log(world, `${c.def.name} hit the ${foe === s.enemy ? 'Herald' : 'Warden'} for ${c.atk}.`);
  } else if (target?.board !== undefined && foe.board[target.board]) {
    const t = foe.board[target.board];
    if (guards.length > 0 && !t.def.guard) return EVENT_INVALID;
    t.hp -= c.atk;
    c.hp -= t.atk;
    sweepDead(foe);
    sweepDead(side);
    log(world, `${c.def.name} fought ${t.def.name}.`);
  } else return EVENT_INVALID;
  if (side.board.includes(c)) c.canAttack = false;
  checkOver(world);
  return EVENT_ATTACK;
}

/** End `side`'s turn and start the other's. */
export function endTurn(world, side) {
  const s = world.state;
  if (s.phase === 'over') return EVENT_INVALID;
  const next = otherOf(world, side);
  s.phase = next === s.player ? 'player' : 'ai';
  if (next === s.player) s.turn += 1;
  startTurn(world, next);
  log(world, next === s.player ? `Turn ${s.turn} — your move.` : 'The Herald takes her turn.');
  return EVENT_TURN;
}

/** One AI action: play the best affordable card, or attack, or end the turn. */
export function aiStep(world) {
  const s = world.state;
  const me = s.enemy;
  const foe = s.player;
  // Spells first when they are clearly good.
  for (let i = 0; i < me.hand.length; i += 1) {
    const def = CARD_BY_ID[me.hand[i]];
    if (me.mana < def.cost) continue;
    if (def.id === 'sigil-insight' && me.hand.length <= 5) return playCard(world, me, i, null);
    if (def.id === 'mending-light' && me.hp <= 16) return playCard(world, me, i, null);
    if (def.id === 'flame-wave' && foe.board.length >= 2) return playCard(world, me, i, null);
    if (def.id === 'ember-surge' && (foe.hp <= 4 || me.mana >= 8)) return playCard(world, me, i, null);
    if (def.id === 'spark-bolt') {
      const big = foe.board.reduce((best, c, j) => (c.atk >= 4 && (best === -1 || c.atk > foe.board[best].atk) ? j : best), -1);
      if (foe.hp <= 3) return playCard(world, me, i, { hero: true });
      if (big !== -1) return playCard(world, me, i, { board: big });
    }
  }
  // Creatures: most expensive affordable first.
  let best = -1;
  for (let i = 0; i < me.hand.length; i += 1) {
    const def = CARD_BY_ID[me.hand[i]];
    if (def.kind === 'creature' && me.mana >= def.cost && me.board.length < MAX_BOARD && (best === -1 || def.cost > CARD_BY_ID[me.hand[best]].cost)) best = i;
  }
  if (best !== -1) return playCard(world, me, best, null);
  // Attacks: kill a Guard, else trade up, else go face.
  for (let i = 0; i < me.board.length; i += 1) {
    const c = me.board[i];
    if (!c.canAttack) continue;
    const guards = foe.board.map((g, j) => ({ g, j })).filter((x) => x.g.def.guard);
    if (guards.length > 0) return attack(world, me, i, { board: guards[0].j });
    const trade = foe.board.findIndex((t) => t.atk >= c.hp && c.atk >= t.hp);
    if (trade !== -1) return attack(world, me, i, { board: trade });
    return attack(world, me, i, { hero: true });
  }
  // A leftover cheap spell on the hero rather than nothing.
  for (let i = 0; i < me.hand.length; i += 1) {
    const def = CARD_BY_ID[me.hand[i]];
    if (def.id === 'spark-bolt' && me.mana >= def.cost) return playCard(world, me, i, { hero: true });
  }
  return endTurn(world, me);
}

/**
 * The player's autopilot: plays every affordable card and attacks with everything,
 * `bias` 1 plays to win, -1 plays to lose (never attacks the hero), 0 plays straight.
 * Used by the screenshot scenes, which play real games forward.
 */
export function autoPlay(world, side, bias) {
  const s = world.state;
  const foe = otherOf(world, side);
  const failed = new Set();
  let guard = 0;
  while (guard++ < 40) {
    let acted = false;
    for (let i = 0; i < side.hand.length; i += 1) {
      if (failed.has(i)) continue;
      const def = CARD_BY_ID[side.hand[i]];
      if (side.mana < def.cost) continue;
      let ev = EVENT_INVALID;
      if (def.kind === 'creature') ev = playCard(world, side, i, null);
      else if (def.id === 'sigil-insight') ev = playCard(world, side, i, null);
      else if (def.id === 'mending-light' && side.hp <= 20) ev = playCard(world, side, i, null);
      else if (def.id === 'flame-wave' && foe.board.length >= 2) ev = playCard(world, side, i, null);
      else if (def.id === 'spark-bolt') {
        const big = foe.board.reduce((b, c, j) => (c.atk >= 3 && (b === -1 || c.atk > foe.board[b].atk) ? j : b), -1);
        if (big !== -1) ev = playCard(world, side, i, { board: big });
        else if (bias >= 0 && foe.hp <= 3) ev = playCard(world, side, i, { hero: true });
        else continue;
      } else if (def.id === 'ember-surge' && (bias >= 0 || side.mana >= 9)) ev = playCard(world, side, i, null);
      else continue;
      if (ev === EVENT_INVALID) { failed.add(i); continue; }
      acted = true;
      break;
    }
    if (acted) continue;
    for (let i = 0; i < side.board.length; i += 1) {
      const c = side.board[i];
      if (!c.canAttack) continue;
      const guards = foe.board.map((g, j) => ({ g, j })).filter((x) => x.g.def.guard);
      let ev = EVENT_INVALID;
      if (guards.length > 0) ev = attack(world, side, i, { board: guards[0].j });
      else if (bias < 0) {
        const trade = foe.board.findIndex((t) => t.atk >= c.hp && c.atk >= t.hp);
        if (trade !== -1) ev = attack(world, side, i, { board: trade });
        else continue;
      } else ev = attack(world, side, i, { hero: true });
      if (ev !== EVENT_INVALID) { acted = true; break; }
    }
    if (!acted) break;
    if (s.phase === 'over') break;
  }
}

export function createWorld(random) {
  const world = { random, state: null };
  world.reset = () => {
    const player = makeSide(random);
    const enemy = makeSide(random);
    world.state = {
      turn: 1, phase: 'player', winner: null, player, enemy,
      log: ['The duel begins. Turn 1 — your move.'], selected: null, targeting: null,
    };
    for (let i = 0; i < START_HAND; i += 1) {
      drawCard(player);
      drawCard(enemy);
    }
    startTurn(world, player);
  };
  world.reset();
  return world;
}
