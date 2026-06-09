/* ============================================================
   Achievement Guide — interactivity (extracted verbatim from the
   reference implementation; do not rewrite, only extend). */

/* Achievement Guide — interactivity
 * - Checklist state persisted in localStorage, keyed by game slug
 * - Spoiler reveal on click
 * - Tracker panel collapse/expand
 * - Two-way sync between in-card checkboxes and tracker checkboxes (same data-track-id)
 */

(function () {
  'use strict';

  // The GAME_SLUG global is set by the generated HTML inline.
  // Falls back to the document title slug if not set.
  const SLUG = (typeof window.GAME_SLUG === 'string' && window.GAME_SLUG)
    ? window.GAME_SLUG
    : (document.title || 'guide').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const STORAGE_KEY = 'achievement-guide:' + SLUG;

  // ---- State ----
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage may be disabled; fail silently.
    }
  }

  let state = loadState();

  // ---- Checkbox sync ----
  function getAllCheckboxesById(id) {
    return Array.from(document.querySelectorAll('input[type="checkbox"][data-track-id="' + CSS.escape(id) + '"]'));
  }

  function applyState() {
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"][data-track-id]');
    allCheckboxes.forEach(cb => {
      const id = cb.getAttribute('data-track-id');
      cb.checked = !!state[id];
      const li = cb.closest('li');
      if (li) li.classList.toggle('completed', cb.checked);
    });
    updateProgress();
  }

  function onCheckboxChange(e) {
    const cb = e.target;
    if (!cb.matches('input[type="checkbox"][data-track-id]')) return;
    const id = cb.getAttribute('data-track-id');
    state[id] = cb.checked;
    saveState(state);

    // Sync siblings with same id (tracker <-> card)
    getAllCheckboxesById(id).forEach(other => {
      if (other !== cb) other.checked = cb.checked;
      const li = other.closest('li');
      if (li) li.classList.toggle('completed', cb.checked);
    });
    updateProgress();
  }

  // ---- Progress display ----
  function updateProgress() {
    const byKind = { achievement: { total: 0, done: 0 },
                     item: { total: 0, done: 0 },
                     trainer: { total: 0, done: 0 } };
    const seen = new Set();
    document.querySelectorAll('input[type="checkbox"][data-track-id]').forEach((cb) => {
      const id = cb.getAttribute("data-track-id");
      if (seen.has(id)) return;          // each id counts once even if mirrored in the tracker
      seen.add(id);
      const kind = cb.getAttribute("data-track-kind") || "achievement";
      if (!byKind[kind]) byKind[kind] = { total: 0, done: 0 };
      byKind[kind].total += 1;
      if (state[id]) byKind[kind].done += 1;
    });

    const ach = byKind.achievement;
    const progressEl = document.querySelector(".tracker-progress");
    if (progressEl) progressEl.textContent = ach.done + " / " + ach.total;
    const barFill = document.querySelector(".tracker-bar-fill");
    if (barFill) barFill.style.width = (ach.total === 0 ? 0 : (ach.done / ach.total) * 100) + "%";

    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set("[data-completed-count]", ach.done);
    set("[data-total-count]", ach.total);
    set("[data-items-done]", byKind.item.done);
    set("[data-items-total]", byKind.item.total);
    set("[data-trainers-done]", byKind.trainer.done);
    set("[data-trainers-total]", byKind.trainer.total);
  }

  // ---- Tracker collapse ----
  function setupTrackerToggle() {
    const tracker = document.querySelector('.tracker');
    const header = document.querySelector('.tracker-header');
    if (!tracker || !header) return;
    header.addEventListener('click', () => {
      tracker.classList.toggle('open');
    });
  }

  // ---- Spoiler reveal ----
  function setupSpoilers() {
    document.querySelectorAll('.spoiler').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.add('revealed');
      });
    });
  }

  // ---- Reset button ----
  function setupReset() {
    const btn = document.querySelector('[data-reset-progress]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!confirm('Reset all checklist progress for this game?')) return;
      state = {};
      saveState(state);
      applyState();
    });
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', () => {
    setupTrackerToggle();
    setupSpoilers();
    setupReset();
    document.addEventListener('change', onCheckboxChange);
    applyState();
  });
})();

