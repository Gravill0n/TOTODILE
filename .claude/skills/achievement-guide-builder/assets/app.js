/* ============================================================
   Achievement Guide — interactivity (extracted verbatim from the
   reference implementation; do not rewrite, only extend). */

/* Achievement Guide — interactivity
 * - Checklist state persisted in localStorage, keyed by game slug
 * - Spoiler reveal on click
 * - Tracker panel collapse/expand
 * - Two-way sync between in-card checkboxes and tracker checkboxes (same data-ach-id)
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
    return Array.from(document.querySelectorAll('input[type="checkbox"][data-ach-id="' + CSS.escape(id) + '"]'));
  }

  function applyState() {
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"][data-ach-id]');
    allCheckboxes.forEach(cb => {
      const id = cb.getAttribute('data-ach-id');
      cb.checked = !!state[id];
      const li = cb.closest('li');
      if (li) li.classList.toggle('completed', cb.checked);
    });
    updateProgress();
  }

  function onCheckboxChange(e) {
    const cb = e.target;
    if (!cb.matches('input[type="checkbox"][data-ach-id]')) return;
    const id = cb.getAttribute('data-ach-id');
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
    // Count unique achievement IDs (each one only counts once even if duplicated in DOM)
    const ids = new Set();
    document.querySelectorAll('input[type="checkbox"][data-ach-id]').forEach(cb => {
      ids.add(cb.getAttribute('data-ach-id'));
    });
    const total = ids.size;
    let done = 0;
    ids.forEach(id => { if (state[id]) done += 1; });

    const progressEl = document.querySelector('.tracker-progress');
    if (progressEl) progressEl.textContent = done + ' / ' + total;

    const barFill = document.querySelector('.tracker-bar-fill');
    if (barFill) {
      const pct = total === 0 ? 0 : (done / total) * 100;
      barFill.style.width = pct + '%';
    }

    const completedCount = document.querySelector('[data-completed-count]');
    if (completedCount) completedCount.textContent = done;
    const totalCount = document.querySelector('[data-total-count]');
    if (totalCount) totalCount.textContent = total;
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

