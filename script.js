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

    // Timer urgent state: add/remove .timer-urgent class based on seconds left
    const enteringUrgent = isPlaying && timeLeft <= 5 && timeLeft > 0;
    if (enteringUrgent) {
        timeEl.parentElement.classList.add("timer-urgent");
    } else {
        timeEl.parentElement.classList.remove("timer-urgent");
    }

    // #region agent log
    try {
      const parentEl = timeEl.parentElement;
      const cs = getComputedStyle(timeEl);
      const csParent = getComputedStyle(parentEl);
      const statNthChild2 = document.querySelector('.game__stats .stat:nth-child(2)');
      const csTimeV2 = statNthChild2 ? getComputedStyle(statNthChild2.querySelector('.stat__value')) : null;
      fetch('http://127.0.0.1:7424/ingest/718845ce-6025-4255-9a5b-e339f1522faa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d2602'},body:JSON.stringify({
        sessionId:'7d2602',runId:'pre-fix-2',hypothesisId:'B',location:'script.js:updateUI',
        message:'updateUI state v2',
        data:{
          score,timeLeft,isPlaying,enteringUrgent,
          parentClass:parentEl.className,
          parentMatchesNth2:parentEl.matches('.game__stats .stat:nth-child(2)'),
          timeEl_animName:cs.animationName,
          timeEl_color:cs.color,
          timeEl_textShadow:cs.textShadow,
          parentEl_animName:csParent.animationName,
          parentEl_color:csParent.color,
          nth2_query_found:!!statNthChild2,
          nth2_value_anim:csTimeV2?csTimeV2.animationName:null,
          nth2_value_color:csTimeV2?csTimeV2.color:null,
        },
        timestamp:Date.now()
      })}).catch(()=>{});
    } catch(e){}
    // #endregion
}

/**
 * Trigger a score bump animation on the score element.
 * CSS handles the visual; JS just toggles the class.
 */
function bumpScore() {
    // Remove first to re-trigger animation if called rapidly
    scoreEl.classList.remove("bump");
    // Force reflow so the removal actually registers before we re-add
    void scoreEl.offsetWidth;
    scoreEl.classList.add("bump");

    // #region agent log
    try { fetch('http://127.0.0.1:7424/ingest/718845ce-6025-4255-9a5b-e339f1522faa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d2602'},body:JSON.stringify({sessionId:'7d2602',runId:'pre-fix-1',hypothesisId:'D',location:'script.js:bumpScore',message:'bump triggered',data:{className:scoreEl.className,computedAnim:getComputedStyle(scoreEl).animationName},timestamp:Date.now()})}).catch(()=>{}); } catch(e){}
    // #endregion

    scoreEl.addEventListener("animationend", () => {
        scoreEl.classList.remove("bump");
    }, { once: true });
}

/**
 * Spawn a ripple at (x, y) relative to the game area.
 * Uses CSS animation — no canvas or libraries.
 */
function spawnRipple(x, y) {
    const ripple = document.createElement("span");
    ripple.className = "ripple";

    // Center the ripple on the click point
    const rippleSize = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue("--target-size").trim(), 10) || 64;
    ripple.style.width  = `${rippleSize}px`;
    ripple.style.height = `${rippleSize}px`;
    ripple.style.left   = `${x - rippleSize / 2}px`;
    ripple.style.top    = `${y - rippleSize / 2}px`;

    gameArea.appendChild(ripple);

    ripple.addEventListener("animationend", () => ripple.remove());
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

    // Scoring + effects: only works while game is actively playing
    target.addEventListener("click", (e) => {
        if (!isPlaying) return;

        // 1. Capture click position relative to game area (for ripple)
        const rect = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 2. Burst animation on current target, then spawn new one
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

    // #region agent log
    try { fetch('http://127.0.0.1:7424/ingest/718845ce-6025-4255-9a5b-e339f1522faa',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d2602'},body:JSON.stringify({sessionId:'7d2602',runId:'pre-fix-1',hypothesisId:'C',location:'script.js:spawnTarget',message:'target spawned',data:{randomX,randomY,targetSize,areaW:areaRect.width,areaH:areaRect.height,computedAnim:getComputedStyle(target).animation},timestamp:Date.now()})}).catch(()=>{}); } catch(e){}
    // #endregion
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

    // 0. Clean up any lingering animations from previous round
    timeEl.parentElement.classList.remove("timer-urgent");

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

    // 3. Clean up timer-urgent animation
    timeEl.parentElement.classList.remove("timer-urgent");

    // 4. Update state
    isPlaying = false;
    timeLeft  = 0;
    updateUI();

    // 5. Show result screen & restore start button
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