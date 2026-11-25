/**
 * glitch.js — the scrambling layer, plus the GM's Stabilize switch.
 *
 * The warp (SVG filters in index.html) and the red/cyan fringing (CSS
 * keyframes) run themselves. This file only swaps characters, which is
 * what makes the text read as actively being forgotten.
 */

const BASE_TICK = 100;                           // ms between ticks of the shared loop
const EVERY   = { 1: 5, 2: 3, 3: 2 };            // act every Nth tick: 500 / 300 / 200 ms
const AMOUNT  = { 1: 0.08, 2: 0.27, 3: 0.55 };   // share of characters swapped
const CHANCE  = { 1: 0.25, 2: 0.55, 3: 0.90 };   // odds of scrambling vs showing the truth
const SURGE_TICK = 2000;                          // ms between rolls
const SURGE_CHANCE = { 1: 0.05, 2: 0.25, 3: 0 };  // 1-in-20, 1-in-4, never
const SURGE_MIN_MS = 110;                         // how long a spike lasts
const SURGE_MAX_MS = 260;


const STABILIZE_KEY = "lyndryss.wiki.stabilize";

const SUBTLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&@*<>/\\|~^";
// Block and box glyphs for level 3. Built from code points so there is
// nothing exotic to type by hand.
const HEAVY = "#%&@*<>/\\|~^" +
    String.fromCharCode(0x2591, 0x2592, 0x2593, 0x2588, 0x259a, 0x259e, 0x2573, 0x25c6, 0x25a0);

let entries = [];
let ticks = 0;
let timer = null;
let surgeTimer = null;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");
let stabilized = false;


function levelOf(el) {
    if (el.classList.contains("glitch--3")) { return 3; }
    if (el.classList.contains("glitch--2")) { return 2; }
    if (el.classList.contains("glitch--1")) { return 1; }
    return 0;
}

/**
 * Every text node inside `root`, with its original string remembered.
 * Walking nodes (rather than rewriting textContent) keeps nested links
 * and other markup intact.
 */
function collectText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node = walker.nextNode();
    while (node) {
        texts.push({ node: node, original: node.nodeValue });
        node = walker.nextNode();
    }
    return texts;
}

function scramble(entry, level) {
    const set = level === 3 ? HEAVY : SUBTLE;
    const amount = AMOUNT[level];

    for (const text of entry.texts) {
        const chars = text.original.split("");
        const swaps = Math.round(chars.length * amount);
        for (let i = 0; i < swaps; i++) {
            const at = Math.floor(Math.random() * chars.length);
            if (chars[at] === " ") { continue; }
            chars[at] = set.charAt(Math.floor(Math.random() * set.length));
        }
        text.node.nodeValue = chars.join("");
    }
}

function restore(entry) {
    for (const text of entry.texts) {
        text.node.nodeValue = text.original;
    }
}

function tick() {
    if (stabilized || document.hidden) { return; }

    ticks++;
    for (const entry of entries) {
        if (entry.surging) { continue; }
        if (ticks % EVERY[entry.level] !== 0) { continue; }
        if (Math.random() > CHANCE[entry.level]) {
            restore(entry);
        } else {
            scramble(entry, entry.level);
        }
    }
}

/** Briefly slam on run up to level-3 distortion then let it fall back */
function surge(entry) {
    if (entry.surging) { return; }
    entry.surging = true;

    entry.el.classList.add("glitch--surge");
    scramble(entry, 3);

    // Random duration so repeat surges never feel metronomic
    const ms = SURGE_MIN
}
/** Re-scan after a render. Call with the element that was just drawn into. */
export function refreshGlitch(root) {
    entries = [];
    for (const el of root.querySelectorAll(".glitch")) {
        if (el.parentElement.closest(".glitch")) { continue; }

        const level = levelOf(el);
        if (level === 0) { continue; }
        entries.push({ el: el, level: level, texts: collectText(el) });
    }
}

/**Start the shared loop */
export function startGlitch() {
    if (timer === null) {
        timer = setInterval(tick, BASE_TICK);
    }
}

export function isStabilized() {
    return stabilized;
}

/** GM switch: drop the effect and put the real characters back. */
export function setStabilized(on) {
    stabilized = on;
    document.body.classList.toggle("is-stabilized", on);
    try {
        window.localStorage.setItem(STABILIZE_KEY, on ? "1" : "0");
    } catch (err) {
        // Private windows can refuse storage
    }
    if (on) {
        for (const entry of entries) { restore(entry); }
    }
}

/** Re-apply the saved choice at boot. */
export function loadStabilized() {
    let saved = null;
    try {
        saved = window.localStorage.getItem(STABILIZE_KEY);
    } catch (err) {
        saved = null;
    }
    setStabilized(saved === "1");
}