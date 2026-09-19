// =====================================================
// Click Speed Game — Core Logic
// Handles game state, timer, target spawning, and start/end flow.
// =====================================================

// ----- DOM References -----
const startBtn = document.getElementById("start-btn");
const scoreEl  = document.getElementById("score");
const timeEl   = document.getElementById("time");
const gameArea = document.querySelector(".game__area");

// ----- Game Constants -----
const GAME_DURATION  = 30;              // total seconds per round
const BEST_SCORE_KEY = "clickSpeed.bestScore";

// ----- Game State -----
let score     = 0;
let timeLeft  = GAME_DURATION;
let timerId   = null;     // setInterval handle, null when no timer running
let isPlaying = false;    // guards against clicks after game ends
let activeTarget = null;  // current target element (single source of truth)

// ----- High Score Helpers -----
function getBestScore() {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n   = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function setBestScore(value) {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
}

// ----- DOM Helpers -----
function updateUI() {
    scoreEl.textContent = score;
    timeEl.textContent  = timeLeft;

    // Urgent timer style when ≤ 5s left and game is running
    const urgent = isPlaying && timeLeft <= 5 && timeLeft > 0;
    timeEl.parentElement.classList.toggle("timer-urgent", urgent);
}

/** Play the "score bump" animation by re-triggering the CSS animation. */
function bumpScore() {
    scoreEl.classList.remove("bump");
    // Force reflow so re-adding the class restarts the animation
    void scoreEl.offsetWidth;
    scoreEl.classList.add("bump");
    scoreEl.addEventListener("animationend", () => {
        scoreEl.classList.remove("bump");
    }, { once: true });
}

/** Spawn a ripple at (x, y) relative to the game area. */
function spawnRipple(x, y) {
    const rippleSize = getTargetSize();
    const ripple     = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width  = `${rippleSize}px`;
    ripple.style.height = `${rippleSize}px`;
    ripple.style.left   = `${x - rippleSize / 2}px`;
    ripple.style.top    = `${y - rippleSize / 2}px`;
    gameArea.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

/** Read --target-size from CSS so responsive breakpoints are respected. */
function getTargetSize() {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--target-size")
        .trim();
    return raw ? parseInt(raw, 10) : 64;
}

/**
 * Compute a random (x, y) inside the game area that keeps the full
 * target visible. Uses live rect dimensions, so it works across resize.
 */
function getRandomPosition() {
    const rect       = gameArea.getBoundingClientRect();
    const targetSize = getTargetSize();
    const maxX = Math.max(0, rect.width  - targetSize);
    const maxY = Math.max(0, rect.height - targetSize);
    return {
        x: Math.floor(Math.random() * (maxX + 1)),
        y: Math.floor(Math.random() * (maxY + 1)),
    };
}

/** Reposition the current target if it falls outside the area after resize. */
function repositionActiveTarget() {
    if (!activeTarget || !isPlaying) return;
    const { x, y } = getRandomPosition();
    activeTarget.style.left = `${x}px`;
    activeTarget.style.top  = `${y}px`;
}

/** Remove any current target from the DOM. */
function clearTarget() {
    if (activeTarget) {
        activeTarget.remove();
        activeTarget = null;
    }
}

/** Spawn a new target at a random valid position. Removes any previous one. */
function spawnTarget() {
    // Clear the previous target if it's still around
    if (activeTarget) activeTarget.remove();

    const { x, y } = getRandomPosition();

    const target = document.createElement("button");
    target.type            = "button";
    target.className       = "target";
    target.setAttribute("aria-label", "Click target");
    target.style.left      = `${x}px`;
    target.style.top       = `${y}px`;

    target.addEventListener("click", (e) => {
        // Ignore clicks after the game has ended
        if (!isPlaying) return;

        // Capture click position relative to the game area for the ripple
        const rect   = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Burst animation, then on completion: spawn ripple, score, new target
        target.classList.add("target--burst");
        target.addEventListener("animationend", () => {
            spawnRipple(clickX, clickY);
            score += 1;
            bumpScore();
            updateUI();
            spawnTarget();
        }, { once: true });
    });

    gameArea.appendChild(target);
    activeTarget = target;
}

// ----- Timer -----
function updateTimer() {
    timeLeft -= 1;
    updateUI();

    // Stop at 0 — single source of truth for game ending
    if (timeLeft <= 0) {
        endGame();
    }
}

// ----- Game Lifecycle -----
function startGame() {
    // Guard against multiple Start clicks creating duplicate timers
    if (isPlaying) return;

    // Clean up any leftover result panel from a previous round
    const oldPanel = gameArea.querySelector(".result");
    if (oldPanel) oldPanel.remove();

    // Reset state
    score    = 0;
    timeLeft = GAME_DURATION;
    isPlaying = true;
    updateUI();

    // Hide the Start button — Play Again now lives on the result panel
    startBtn.hidden = true;

    // Spawn first target and start the countdown
    spawnTarget();
    timerId = setInterval(updateTimer, 1000);
}

function endGame() {
    // Stop the countdown (idempotent — safe if called more than once)
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }

    // Mark game as ended so any pending target clicks are ignored
    isPlaying = false;

    // Clean up the target and urgent-timer styling
    clearTarget();
    timeEl.parentElement.classList.remove("timer-urgent");

    // Persist best score if this round beat it
    const previousBest = getBestScore();
    const isNewBest    = score > previousBest && score > 0;
    if (isNewBest) setBestScore(score);
    const bestScore = Math.max(score, previousBest);

    // Time stays at 0 on the final UI
    timeLeft = 0;
    updateUI();

    // Show the result panel with Final Score, CPS, Best Score, Play Again
    showResultScreen(bestScore, isNewBest);
}

/**
 * Render the end-of-round result panel inside .game__area.
 * Includes a Play Again button that fully resets and restarts the game.
 */
function showResultScreen(bestScore, isNewBest) {
    const panel = document.createElement("div");
    panel.className = "result";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    const cps = (score / GAME_DURATION).toFixed(2);

    panel.innerHTML = `
        <h2 class="result__title">Time's up!</h2>
        <div class="result__stats">
            <div class="result__col">
                <span class="result__label">Final Score</span>
                <strong class="result__value" id="result-final-score">${score}</strong>
            </div>
            <div class="result__col">
                <span class="result__label">Clicks / Sec</span>
                <strong class="result__value result__value--small" id="result-cps">${cps}</strong>
            </div>
            <div class="result__col result__col--best">
                <span class="result__label">Best Score</span>
                <strong class="result__value result__value--small" id="result-best">${bestScore}</strong>
            </div>
        </div>
        ${isNewBest ? `<p class="result__badge">New Best!</p>` : ""}
        <button type="button" class="game__start result__btn" id="restart-btn">
            Play Again
        </button>
    `;

    gameArea.appendChild(panel);

    // Play Again: remove the panel and start a fresh round.
    // Guard against double-clicks: if a game is already in progress, ignore.
    const restartBtn = panel.querySelector("#restart-btn");
    restartBtn.addEventListener("click", () => {
        if (isPlaying) return;
        panel.remove();
        startGame();
    });
}

// ----- Event Bindings -----
startBtn.addEventListener("click", startGame);

// Reposition the active target on resize so it never falls outside the area.
// Debounced via rAF to avoid spamming during continuous resize events.
let resizeFrame = null;
window.addEventListener("resize", () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        repositionActiveTarget();
    });
});

// ----- Initial Render -----
updateUI();