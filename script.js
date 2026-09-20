// =====================================================
// Click Speed Game — Core Logic
// =====================================================

// ----- DOM -----
const startBtn = document.getElementById("start-btn");
const scoreEl  = document.getElementById("score");
const timeEl   = document.getElementById("time");
const gameArea = document.querySelector(".game__area");

// ----- Constants -----
const GAME_DURATION  = 30;
const TARGET_PADDING = 8;            // safety gap from game-area edges
const BEST_SCORE_KEY = "clickSpeed.bestScore";
const CONFETTI_COLORS = ["#22d3ee", "#67e8f9", "#fbbf24", "#a78bfa", "#f472b6", "#34d399"];

// ----- State -----
let score        = 0;
let timeLeft     = GAME_DURATION;
let isPlaying    = false;            // true only while a round is active
let timerId      = null;             // setInterval handle, null when stopped
let activeTarget = null;             // current target DOM node
let resizeFrame  = null;             // rAF id for debounced resize handling

// =====================================================
// High-score persistence
// =====================================================
function getBestScore() {
    const n = parseInt(localStorage.getItem(BEST_SCORE_KEY), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function setBestScore(value) {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
}

// =====================================================
// UI helpers
// =====================================================
function updateUI() {
    scoreEl.textContent = score;
    timeEl.textContent  = timeLeft;

    // Urgent timer style when ≤ 5s left and a round is active
    const urgent = isPlaying && timeLeft > 0 && timeLeft <= 5;
    timeEl.parentElement.classList.toggle("timer-urgent", urgent);
}

/** Re-trigger the score bump animation by toggling the class. */
function bumpScore() {
    scoreEl.classList.remove("bump");
    void scoreEl.offsetWidth;        // force reflow so animation restarts
    scoreEl.classList.add("bump");
    scoreEl.addEventListener("animationend",
        () => scoreEl.classList.remove("bump"),
        { once: true });
}

/** Read --target-size from CSS so responsive breakpoints are respected. */
function getTargetSize() {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--target-size").trim();
    return parseInt(raw, 10) || 64;
}

// =====================================================
// Target spawning
// =====================================================
/** Random position inside .game__area keeping the target fully visible. */
function getRandomPosition() {
    const rect       = gameArea.getBoundingClientRect();
    const targetSize = getTargetSize() + TARGET_PADDING;
    const maxX = Math.max(0, rect.width  - targetSize);
    const maxY = Math.max(0, rect.height - targetSize);
    return {
        x: Math.floor(Math.random() * (maxX + 1)),
        y: Math.floor(Math.random() * (maxY + 1)),
    };
}

function clearTarget() {
    if (!activeTarget) return;
    activeTarget.remove();
    activeTarget = null;
}

function repositionActiveTarget() {
    if (!activeTarget || !isPlaying) return;
    const { x, y } = getRandomPosition();
    activeTarget.style.left = `${x}px`;
    activeTarget.style.top  = `${y}px`;
}

/**
 * Spawn a new target. The previous one (if any) is removed first.
 * Clicking a target ignores itself once the round has ended.
 */
function spawnTarget() {
    clearTarget();

    const { x, y } = getRandomPosition();

    const target = document.createElement("button");
    target.type      = "button";
    target.className = "target";
    target.setAttribute("aria-label", "Click target");
    target.style.left = `${x}px`;
    target.style.top  = `${y}px`;

    target.addEventListener("click", (e) => {
        // Click after the round ends (e.g. during the burst animation)
        // must be ignored so score and timer stay consistent.
        if (!isPlaying) return;

        // Capture click coords relative to .game__area for the ripple
        const rect   = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        target.classList.add("target--burst");
        target.addEventListener("animationend", () => {
            spawnRipple(clickX, clickY);
            score += 1;
            bumpScore();
            updateUI();
            spawnTarget();                // recursive next target
        }, { once: true });
    });

    gameArea.appendChild(target);
    activeTarget = target;
}

// =====================================================
// Ripple — visual feedback on target click
// =====================================================
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

// =====================================================
// Game lifecycle
// =====================================================
function startGame() {
    // Guard: prevent double-clicks from creating duplicate timers
    if (isPlaying) return;

    // Remove leftover result panel from previous round
    gameArea.querySelector(".result")?.remove();

    // Reset round state
    score    = 0;
    timeLeft = GAME_DURATION;
    isPlaying = true;
    updateUI();

    // Hide Start button while playing; Play Again lives on result panel
    startBtn.hidden = true;

    spawnTarget();
    timerId = setInterval(tick, 1000);
}

function tick() {
    timeLeft -= 1;
    updateUI();
    if (timeLeft <= 0) endGame();      // stop the clock, show results
}

function endGame() {
    // Idempotent — safe if invoked more than once
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    isPlaying = false;

    clearTarget();
    timeEl.parentElement.classList.remove("timer-urgent");

    // Persist high score if beaten
    const previousBest = getBestScore();
    const isNewBest    = score > previousBest;
    if (isNewBest) setBestScore(score);
    const bestScore = Math.max(score, previousBest);

    timeLeft = 0;                      // freeze display at 0
    updateUI();
    showResultScreen(bestScore, isNewBest);
}

// =====================================================
// Result screen
// =====================================================
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
                <strong class="result__value" id="result-final-score">0</strong>
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

    // Celebration: flash + burst + confetti + score count-up
    spawnFlash();
    spawnBurst(panel);
    spawnConfetti(isNewBest ? 80 : 40);
    animateScoreCountUp(panel.querySelector("#result-final-score"), score, 1200);

    // Play Again: remove the panel, restart a round
    panel.querySelector("#restart-btn").addEventListener("click", () => {
        if (isPlaying) return;          // debounce
        panel.remove();
        startGame();
    });
}

// =====================================================
// Celebration effects
// =====================================================
function randomColor() {
    return CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
}

/** Brief colored flash inside .game__area — an instant "win!" cue. */
function spawnFlash() {
    const flash = document.createElement("div");
    flash.className = "result-flash";
    gameArea.appendChild(flash);
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
}

/** Radial burst of glowing particles from the center of `originEl`. */
function spawnBurst(originEl) {
    const rect    = originEl.getBoundingClientRect();
    const cx      = rect.left + rect.width  / 2;
    const cy      = rect.top  + rect.height / 2;
    const COUNT   = 36;

    for (let i = 0; i < COUNT; i++) {
        const angle    = (Math.PI * 2 * i) / COUNT + (Math.random() * 0.4 - 0.2);
        const distance = 80 + Math.random() * 120;        // 80–200 px
        const size     = 8 + Math.random() * 8;

        const p = document.createElement("span");
        p.className   = "particle particle--burst";
        const color   = randomColor();
        p.style.background = color;
        p.style.color      = color;                        // drives glow shadow
        p.style.width  = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left   = `${cx}px`;
        p.style.top    = `${cy}px`;
        p.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        p.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);

        document.body.appendChild(p);
        p.addEventListener("animationend", () => p.remove(), { once: true });
    }
}

/** Falling confetti across the top of the game card. */
function spawnConfetti(count) {
    const gameRect  = gameArea.getBoundingClientRect();
    const gameLeft  = gameRect.left;
    const gameWidth = gameRect.width;
    const fallStart = gameRect.top - 20;

    for (let i = 0; i < count; i++) {
        const isRect = Math.random() < 0.4;               // mix of circles & rectangles
        const p      = document.createElement("span");
        p.className   = `particle particle--confetti${isRect ? " particle--rect" : ""}`;
        p.style.background = randomColor();

        const size   = isRect ? 6 + Math.random() * 4 : 7 + Math.random() * 6;
        const length = isRect ? 12 + Math.random() * 8 : size;

        p.style.left   = `${gameLeft + Math.random() * gameWidth}px`;
        p.style.top    = `${fallStart}px`;
        p.style.width  = `${size}px`;
        p.style.height = `${length}px`;
        p.style.animationDelay = `${Math.random() * 0.4}s`;
        p.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);

        document.body.appendChild(p);
        p.addEventListener("animationend", () => p.remove(), { once: true });
    }
}

/** Animate a number element counting up from 0 to `target`. */
function animateScoreCountUp(el, target, duration = 900) {
    if (!el) return;
    const start = performance.now();

    function frame(now) {
        const t     = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);              // ease-out cubic
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = target;                     // pin to exact value
    }
    requestAnimationFrame(frame);
}

// =====================================================
// Event bindings
// =====================================================
startBtn.addEventListener("click", startGame);

// Reposition the active target on resize so it never falls outside.
// rAF debounce keeps this cheap during continuous resize events.
window.addEventListener("resize", () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        repositionActiveTarget();
    });
});

// Initial render
updateUI();
