// Boot and the one loop: Ember Sigil is turn-based, so the loop redraws, runs the
// Herald's turn on a timer, and answers clicks and keys. ?seed=N fixes the shuffle.
// ?shot=start|play|win|loss (with &seed=N) stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY } from './config.js';
import { CARD_BY_ID } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_ATTACK, EVENT_OVER, EVENT_PLAY, EVENT_SPELL, aiStep, attack, createWorld,
  endTurn, playCard,
} from './world.js';
import { createInput } from './input.js';
import { createRenderer, layoutZones, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the win count then lasts this visit only.
  }
}

// Tiny WebAudio blips, no audio files: a soft pluck for a card, a low thud for an
// attack, a chime for a win. M toggles mute.
let audio = null;
let muted = false;
function blip(freq, dur, type = 'sine', gain = 0.08) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(g).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  } catch {
    // Audio is decoration; a browser without it still plays.
  }
}

function soundFor(events) {
  if (events & EVENT_OVER) blip(660, 0.5, 'sine', 0.12);
  else if (events & EVENT_ATTACK) blip(140, 0.18, 'triangle', 0.12);
  else if (events & EVENT_SPELL) blip(520, 0.25, 'sine', 0.1);
  else if (events & EVENT_PLAY) blip(330, 0.15, 'sine', 0.1);
}

function runShot(name) {
  const best = readBest();
  const scene = stageShot(name, world, best);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let paused = false;
  let aiTimer = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startDuel() {
    world.reset();
    screen = SCREEN_PLAY;
    aiTimer = 0;
    announce('Duel started. Turn 1 — your move.');
  }

  function endDuel() {
    screen = SCREEN_OVER;
    if (world.state.winner === 'player') {
      best += 1;
      saveBest(best);
      announce(`Victory in ${world.state.turn} turns. Duels won: ${best}.`);
    } else {
      announce(`Defeat in ${world.state.turn} turns. Press R to duel again.`);
    }
  }

  function apply(events) {
    soundFor(events);
    if (events & EVENT_OVER) endDuel();
  }

  function tryPlay(handIdx) {
    const s = world.state;
    if (s.phase !== 'player' || screen !== SCREEN_PLAY || paused) return;
    const def = CARD_BY_ID[s.player.hand[handIdx]];
    if (!def) return;
    s.selected = null;
    if (def.kind === 'spell' && def.id === 'spark-bolt') {
      s.targeting = { hand: handIdx };
      announce('Spark Bolt — choose a target.');
      return;
    }
    apply(playCard(world, s.player, handIdx, null));
  }

  function handleClick(point) {
    const s = world.state;
    const zones = layoutZones(s, screen);
    const hit = zones.find((z) => point.x >= z.x && point.x <= z.x + z.w && point.y >= z.y && point.y <= z.y + z.h);
    if (screen === SCREEN_TITLE) {
      if (hit?.kind === 'start') startDuel();
      return;
    }
    if (screen === SCREEN_OVER) {
      if (hit?.kind === 'again') startDuel();
      return;
    }
    if (!hit || paused) return;
    if (s.phase !== 'player') return;
    // Awaiting a Spark Bolt target.
    if (s.targeting) {
      const handIdx = s.targeting.hand;
      s.targeting = null;
      if (hit.kind === 'enemy-hero') apply(playCard(world, s.player, handIdx, { hero: true }));
      else if (hit.kind === 'enemy-board') apply(playCard(world, s.player, handIdx, { board: hit.index }));
      else announce('Spark Bolt needs an enemy target.');
      return;
    }
    if (hit.kind === 'hand') {
      tryPlay(hit.index);
      return;
    }
    if (hit.kind === 'board') {
      const c = s.player.board[hit.index];
      if (c && c.canAttack) {
        s.selected = { board: hit.index };
        announce(`${c.def.name} ready — click an enemy creature or the Herald.`);
      } else if (c) announce(`${c.def.name} cannot attack yet.`);
      return;
    }
    if (hit.kind === 'enemy-board' || hit.kind === 'enemy-hero') {
      if (s.selected?.board !== undefined) {
        const idx = s.selected.board;
        s.selected = null;
        apply(attack(world, s.player, idx, hit.kind === 'enemy-hero' ? { hero: true } : { board: hit.index }));
      }
      return;
    }
    if (hit.kind === 'end-turn') {
      s.selected = null;
      s.targeting = null;
      apply(endTurn(world, s.player));
      aiTimer = 0;
      return;
    }
    s.selected = null;
  }

  function handleKey(code) {
    const s = world.state;
    if (code === 'KeyM') {
      muted = !muted;
      announce(muted ? 'Muted.' : 'Sound on.');
      return;
    }
    if (code === 'KeyP' && screen === SCREEN_PLAY) {
      paused = !paused;
      announce(paused ? 'Paused.' : 'Playing.');
      return;
    }
    if (code === 'KeyR' && screen === SCREEN_OVER) {
      startDuel();
      return;
    }
    if (screen === SCREEN_TITLE && (code === 'Space' || code === 'Enter')) {
      startDuel();
      return;
    }
    if (screen === SCREEN_OVER && (code === 'Space' || code === 'Enter')) {
      startDuel();
      return;
    }
    if (screen !== SCREEN_PLAY || paused || s.phase !== 'player') return;
    if (code === 'Space' || code === 'Enter') {
      s.selected = null;
      s.targeting = null;
      apply(endTurn(world, s.player));
      aiTimer = 0;
      return;
    }
    const n = Number.parseInt(code.replace('Digit', ''), 10);
    if (code.startsWith('Digit') && n >= 1 && n <= 7) tryPlay(n - 1);
  }

  createInput(canvas, handleClick, handleKey);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      paused = true;
      announce('Paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    const s = world.state;
    if (screen === SCREEN_PLAY && !paused && s.phase === 'ai' && s.phase !== 'over') {
      aiTimer += dt;
      if (aiTimer >= 0.7) {
        aiTimer = 0;
        apply(aiStep(world));
      }
    }
    renderer.draw(s, paused && screen === SCREEN_PLAY ? SCREEN_PLAY : screen, best);
  }

  announce('Ember Sigil. Press Space or click Begin the Duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
