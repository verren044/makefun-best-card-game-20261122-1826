// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays real games
// forward from a fresh world with the autopilot, so the frame is what a real duel
// looks like and the same seed always gives the same frame.
import { autoPlay, endTurn } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Play full turns until `stop(state)` is true or the duel ends; returns turns played. */
function playUntil(world, stop) {
  const s = world.state;
  let turns = 0;
  while (s.phase !== 'over' && turns < 60) {
    if (s.phase === 'player') {
      autoPlay(world, s.player, 0);
      if (s.phase !== 'over') endTurn(world, s.player);
    } else {
      autoPlay(world, s.enemy, 0);
      if (s.phase !== 'over') endTurn(world, s.enemy);
    }
    turns += 1;
    if (stop(s, turns)) break;
  }
  return turns;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a fresh table. play: a mid-duel table. win: a duel the
 * Warden won. loss: a duel the Herald won.
 */
export function stageShot(name, world, best) {
  const s = world.state;
  if (name === 'win' || name === 'loss') {
    // Replay duels with a bias until the wanted side wins (or the cap hits).
    for (let attempt = 0; attempt < 12 && world.state.phase !== 'over'; attempt += 1) {
      world.reset();
      const w = world.state;
      let turns = 0;
      while (w.phase !== 'over' && turns < 80) {
        if (w.phase === 'player') {
          autoPlay(world, w.player, name === 'win' ? 1 : -1);
          if (w.phase !== 'over') endTurn(world, w.player);
        } else {
          autoPlay(world, w.enemy, name === 'win' ? -1 : 1);
          if (w.phase !== 'over') endTurn(world, w.enemy);
        }
        turns += 1;
      }
      if (w.phase === 'over' && ((name === 'win') === (w.winner === 'player'))) break;
      if (attempt === 11) break;
    }
    return { screen: SCREEN_OVER, best: name === 'win' ? best + 1 : best };
  }
  if (name === 'play') {
    playUntil(world, (st, turns) => turns >= 8 || st.player.board.length >= 2);
    return { screen: SCREEN_PLAY, best };
  }
  return { screen: SCREEN_TITLE, best };
}
