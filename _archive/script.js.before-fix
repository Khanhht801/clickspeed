// =====================================================
// Click Speed Game — Core Logic
// Handles game state, timer, and start/end flow.
// =====================================================

// ----- DOM References -----
const startBtn   = document.getElementById("start-btn");
const scoreEl    = document.getElementById("score");
const timeEl     = document.getElementById("time");
const gameArea   = document.querySelector(".game__area");

// ----- Game Constants -----
const GAME_DURATION = 30; // seconds

// ----- Game State -----
let score    = 0;
let timeLeft = GAME_DURATION;
let timerId  = null;
let isPlaying = false;

// ----- DOM Helpers -----
function updateUI() {
    scoreEl.textContent = score;
    timeEl.textContent  = timeLeft;
}

/**
 * Read the target size from CSS at call-time so it's always
 * accurate across breakpoints (64px desktop, 58px tablet, 52px mobile).
 */
function getTargetSize() {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--target-size")
        .trim();
    return raw ? parseInt(raw, 10) : 64;
}

/**
 * Spawn a target at a random position inside .game__area.
 * The target is guaranteed to stay fully within the area bounds.
 */
function spawnTarget() {
    // Remove any existing target first
    const existing = gameArea.querySelector(".target");
    if (existing) existing.remove();

    // Read live dimensions (accounts for padding, border, etc.)
    const areaRect = gameArea.getBoundingClientRect();

    // Use CSS custom property so responsive breakpoints are respected
    const targetSize = getTargetSize();

    // Available space = area size minus target size (target must stay inside)
    const maxX = areaRect.width  - targetSize;
    const maxY = areaRect.height - targetSize;

    // Generate random offsets within valid bounds
    const randomX = Math.floor(Math.random() * (maxX + 1));
    const randomY = Math.floor(Math.random() * (maxY + 1));

    // Create and position the target
    const target = document.createElement("button");
    target.type      = "button";
    target.className = "target";
    target.setAttribute("aria-label", "Click target");

    target.style.left = `${randomX}px`;
    target.style.top  = `${randomY}px`;

    // Scoring: only works while game is actively playing
    target.addEventListener("click", () => {
        if (!isPlaying) return;
        score += 1;
        updateUI();
        spawnTarget(); // remove current + spawn new at a new random spot
    });

    gameArea.appendChild(target);
}

function clearTarget() {
    const existing = gameArea.querySelector(".target");
    if (existing) existing.remove();
}

// ----- Timer -----
function updateTimer() {
    if (timeLeft <= 0) {
        endGame();
        return;
    }
    timeLeft -= 1;
    updateUI();

    if (timeLeft <= 0) {
        // Defer endGame by 1 tick so UI shows "0" briefly,
        // then the result screen will replace it.
        setTimeout(endGame, 600);
    }
}

// ----- Game Lifecycle -----
function startGame() {
    if (isPlaying) return; // guard against double-clicks

    // 1. Reset state
    score    = 0;
    timeLeft = GAME_DURATION;
    updateUI();

    // 2. Hide / disable Start button
    startBtn.hidden = true;

    // 3. Spawn the first target
    spawnTarget();

    // 4. Mark playing & start countdown
    isPlaying = true;
    timerId   = setInterval(updateTimer, 1000);
}

function endGame() {
    // 1. Stop the timer (avoid multiple endGame calls)
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }

    // 2. Remove any remaining target
    clearTarget();

    // 3. Update state
    isPlaying = false;
    timeLeft  = 0;
    updateUI();

    // 4. Show result screen & restore start button
    showResultScreen();
}

/**
 * Build a simple result screen inside the game area.
 * The high-score key is reserved for a future step.
 */
function showResultScreen() {
    const panel = document.createElement("div");
    panel.className = "result";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    panel.innerHTML = `
        <h2 class="result__title">Time's up!</h2>
        <p class="result__score">
            Your score:
            <strong class="result__value">${score}</strong>
        </p>
        <button type="button" class="game__start result__btn" id="restart-btn">
            Play Again
        </button>
    `;

    gameArea.appendChild(panel);

    // Restart: hide result, show original Start button, reset logic
    const restartBtn = document.getElementById("restart-btn");
    restartBtn.addEventListener("click", () => {
        panel.remove();
        startBtn.hidden = false;
        // Brief idle state showing the Start button as primary CTA
        updateUI();
    });
}

// ----- Event Bindings -----
startBtn.addEventListener("click", startGame);

// ----- Initial Render -----
updateUI();