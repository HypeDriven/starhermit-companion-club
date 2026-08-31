/* Companion Club — main application module: game state machine, input, UI. */

// ---------- imports (UMD modules) ----------
const CCRNG = require('./rng.js');
const CCRules = require('./rules.js');
const CCStore = require('./store.js');
const CCContent = require('./content.js');
const CCAudio = require('./audio.js');

// ---------- constants ----------
const GAME_NAME = 'Companion Club';

// Game state machine states (see spec section 2)
const STATE_BOOT = 'boot';
const STATE_TITLE = 'title';
const STATE_PROFILE_READY = 'profile-ready';
const STATE_MODE_SELECT = 'mode-select';
const STATE_PREPARING = 'preparing';
const STATE_TUTORIAL_COUNTDOWN = 'tutorial-countdown';
const STATE_ACTIVE = 'active';
const STATE_PAUSED = 'paused';
const STATE_RECONNECTING = 'reconnecting';
const STATE_RESOLVING = 'resolving';
const STATE_RESULTS = 'results';
const STATE_PROGRESSION = 'progression';

// ---------- module-level state (populated by init) ----------
let _state = null;      // current game state object from rules engine
let _settings = {};     // settings snapshot
let _contentVersion = 0;
let _sessionStartedMs = 0;
let _lastCommandId = '';

// Public API surface (populated in init)
const api = {
  GAME_NAME,
};

function init() {
  _settings = CCStore.DEFAULT_SETTINGS ? Object.assign({}, CCStore.DEFAULT_SETTINGS) : {};
}

module.exports = api;
