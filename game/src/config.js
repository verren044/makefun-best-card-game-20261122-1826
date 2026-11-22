// Ember Sigil: an original turn-based card battler. You are the Warden; the Ash Herald
// is the AI. Both start at 30 health. Each turn you gain mana (1 more per turn, up to 10),
// draw a card, play creatures and spells from your hand, and attack with your creatures.
// Reduce the Herald to 0 health to win. Guard creatures must be attacked first;
// Swift creatures may attack the turn they are played.
export const FIELD = { width: 1280, height: 720 };

export const HERO_HP = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 7;
export const MAX_BOARD = 5;
export const START_HAND = 3;

export const BEST_KEY = 'ember-sigil.wins';

/** Card definitions: the whole pool. `def` is the card's printed face; instances copy atk/hp. */
export const CARDS = [
  { id: 'ember-imp', name: 'Ember Imp', kind: 'creature', cost: 1, atk: 2, hp: 1, el: 'fire', text: '' },
  { id: 'frost-wisp', name: 'Frost Wisp', kind: 'creature', cost: 1, atk: 1, hp: 2, el: 'frost', text: '' },
  { id: 'stone-whelp', name: 'Stone Whelp', kind: 'creature', cost: 2, atk: 2, hp: 3, el: 'stone', text: 'Guard', guard: true },
  { id: 'thorn-wolf', name: 'Thorn Wolf', kind: 'creature', cost: 2, atk: 3, hp: 2, el: 'thorn', text: '' },
  { id: 'gale-hawk', name: 'Gale Hawk', kind: 'creature', cost: 3, atk: 4, hp: 2, el: 'gale', text: 'Swift', swift: true },
  { id: 'cinder-knight', name: 'Cinder Knight', kind: 'creature', cost: 3, atk: 3, hp: 4, el: 'fire', text: '' },
  { id: 'tide-serpent', name: 'Tide Serpent', kind: 'creature', cost: 4, atk: 3, hp: 6, el: 'frost', text: '' },
  { id: 'moss-troll', name: 'Moss Troll', kind: 'creature', cost: 4, atk: 4, hp: 5, el: 'thorn', text: 'Guard', guard: true },
  { id: 'pyre-drake', name: 'Pyre Drake', kind: 'creature', cost: 5, atk: 5, hp: 4, el: 'fire', text: '' },
  { id: 'ember-golem', name: 'Ember Golem', kind: 'creature', cost: 6, atk: 6, hp: 6, el: 'stone', text: '' },
  { id: 'spark-bolt', name: 'Spark Bolt', kind: 'spell', cost: 2, el: 'fire', text: 'Deal 3 damage.', dmg: 3, target: 'any' },
  { id: 'mending-light', name: 'Mending Light', kind: 'spell', cost: 2, el: 'gale', text: 'Restore 6 health.', heal: 6, target: 'self' },
  { id: 'sigil-insight', name: 'Sigil Insight', kind: 'spell', cost: 2, el: 'frost', text: 'Draw 2 cards.', draw: 2, target: 'none' },
  { id: 'flame-wave', name: 'Flame Wave', kind: 'spell', cost: 4, el: 'fire', text: 'Deal 2 damage to all enemy creatures.', dmg: 2, target: 'all-enemy' },
  { id: 'ember-surge', name: 'Ember Surge', kind: 'spell', cost: 3, el: 'fire', text: 'Deal 4 damage to the enemy hero.', dmg: 4, target: 'enemy-hero' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** 24 cards: 16 creatures, 8 spells. */
export const DECK_LIST = [
  'ember-imp', 'ember-imp', 'frost-wisp', 'frost-wisp',
  'stone-whelp', 'stone-whelp', 'thorn-wolf', 'thorn-wolf',
  'gale-hawk', 'gale-hawk', 'cinder-knight', 'cinder-knight',
  'tide-serpent', 'moss-troll', 'pyre-drake', 'ember-golem',
  'spark-bolt', 'spark-bolt', 'mending-light', 'mending-light',
  'sigil-insight', 'sigil-insight', 'flame-wave', 'ember-surge',
];

export const PALETTE = {
  backdrop: '#171310',
  table: '#2b2118',
  tableEdge: '#4a3624',
  felt: '#274435',
  feltLine: '#3a5f47',
  panel: '#241c15',
  panelEdge: '#5a4630',
  text: '#f3e9d2',
  muted: '#b8a888',
  gold: '#f2c94c',
  mana: '#58b7e6',
  hp: '#e5534b',
  heal: '#7bc96f',
  fire: '#e86a3c',
  frost: '#7fc4e8',
  stone: '#b09a7a',
  thorn: '#7fb069',
  gale: '#d8c97a',
  cardBack: '#5a2e2e',
  enemy: '#8e3b34',
  player: '#2e6b8e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
