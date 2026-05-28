# style.css — Review Draft

```css
/* ═══════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════ */
:root {
  --color-bg:       #111111;
  --color-surface:  #1e1e1e;
  --color-accent:   #f5a623;
  --color-on-accent:#111111;
  --color-error:    #e53935;
  --color-on-error: #ffffff;
  --color-text:     #f0f0f0;
  --color-muted:    #888888;
  --color-border:   #333333;
  --font-main:      'Barlow Condensed', sans-serif;
  --radius:         12px;
  --map-height:     180px;
}

/* ═══════════════════════════════════════════
   RESET
═══════════════════════════════════════════ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ═══════════════════════════════════════════
   BASE
═══════════════════════════════════════════ */
body {
  font-family: var(--font-main);
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
}

/* ═══════════════════════════════════════════
   APP SHELL
═══════════════════════════════════════════ */
#app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ═══════════════════════════════════════════
   HEADER
═══════════════════════════════════════════ */
#header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

#logo-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

#logo {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-accent);
  text-transform: uppercase;
}

#logo-sub {
  font-size: 0.7rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

#usage-counter {
  font-size: 0.75rem;
  color: var(--color-muted);
}

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
#main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  gap: 16px;
}

/* ═══════════════════════════════════════════
   STATE VISIBILITY — default: all panels hidden
═══════════════════════════════════════════ */
#voice-mode,
#status-bar,
#confirm-panel,
#result-panel,
#error-panel {
  display: none;
}

/* idle — voice-mode + status-bar */
body[data-state="idle"] #voice-mode,
body[data-state="idle"] #status-bar {
  display: flex;
}

/* recording — voice-mode + status-bar */
body[data-state="recording"] #voice-mode,
body[data-state="recording"] #status-bar {
  display: flex;
}

/* transcribing — voice-mode + status-bar */
body[data-state="transcribing"] #voice-mode,
body[data-state="transcribing"] #status-bar {
  display: flex;
}

/* confirming */
body[data-state="confirming"] #confirm-panel {
  display: flex;
}

/* processing — confirm-panel visible, loading block shown */
body[data-state="processing"] #confirm-panel {
  display: flex;
}
body[data-state="processing"] #confirm-loading {
  display: flex;
}

/* result */
body[data-state="result"] #result-panel {
  display: flex;
}

/* error */
body[data-state="error"] #error-panel {
  display: flex;
}

/* ═══════════════════════════════════════════
   VOICE MODE
═══════════════════════════════════════════ */
#voice-mode {
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-top: 16px;
}

/* ─── Photo bar ─── */
#photo-bar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

#photo-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  color: var(--color-muted);
  cursor: pointer;
}

#photo-label:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* ─── Record button ─── */
#record-btn {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: none;
  background: var(--color-accent);
  color: var(--color-on-accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-family: var(--font-main);
  font-weight: 700;
  letter-spacing: 0.08em;
}

#record-icon {
  font-size: 2rem;
  line-height: 1;
}

#record-label {
  font-size: 0.85rem;
}

/* recording pulse */
@keyframes record-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.06); }
}

body[data-state="recording"] #record-btn {
  background: var(--color-error);
  color: var(--color-on-error);
  animation: record-pulse 1.2s ease-in-out infinite;
}

/* ─── Hints ─── */
#record-hint,
#transcribing-hint {
  font-size: 0.9rem;
  color: var(--color-muted);
  text-align: center;
}

#transcribing-hint:empty {
  display: none;
}

/* ─── Status bar ─── */
#status-bar {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

#status-label {
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.06em;
}

#status-text {
  font-size: 0.85rem;
  font-weight: 600;
}

/* ═══════════════════════════════════════════
   CONFIRM PANEL
═══════════════════════════════════════════ */
#confirm-panel {
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-bottom: 24px;
}

/* ─── confirm-loading (hidden by default, shown in processing state) ─── */
#confirm-loading {
  display: none;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

#loading-text {
  font-size: 0.9rem;
  color: var(--color-muted);
}

/* ─── Identity block ─── */
#confirm-identity-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ─── Photo blocks ─── */
#confirm-photo-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#confirm-photo-preview {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

#confirm-photo-none {
  font-size: 0.85rem;
  color: var(--color-muted);
}

#confirm-photo-add {
  display: flex;
}

#photo-label-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  color: var(--color-muted);
  cursor: pointer;
}

#photo-label-confirm:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* hide photo-add once photo is attached */
body.has-photo #confirm-photo-add {
  display: none;
}

/* ─── Transcript & GPS ─── */
#confirm-transcript-block,
#confirm-gps-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#confirm-transcript,
#confirm-gps {
  font-size: 0.95rem;
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

/* ─── Map block ─── */
#confirm-map-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#confirm-map-img {
  width: 100%;
  height: var(--map-height);
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

#confirm-map-unavailable {
  font-size: 0.8rem;
  color: var(--color-muted);
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

/* ─── Confirm actions ─── */
#readback-btn {
  align-self: flex-start;
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-main);
  font-size: 0.9rem;
  cursor: pointer;
}

#readback-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

#submit-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: var(--radius);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-family: var(--font-main);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  min-height: 56px;
}

#submit-btn:hover {
  filter: brightness(1.1);
}

#cancel-btn {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-muted);
  font-family: var(--font-main);
  font-size: 1rem;
  cursor: pointer;
}

#cancel-btn:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}

/* ═══════════════════════════════════════════
   RESULT PANEL
═══════════════════════════════════════════ */
#result-panel {
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-bottom: 24px;
}

#result-urgency-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: var(--color-surface);
  color: var(--color-muted);
  align-self: flex-start;
}

#result-urgency-badge.urgency-low      { background: #1a2a1a; color: #66bb6a; }
#result-urgency-badge.urgency-medium   { background: #2a2200; color: var(--color-accent); }
#result-urgency-badge.urgency-high     { background: #2a1500; color: #ff8c00; }
#result-urgency-badge.urgency-critical { background: #2a0000; color: var(--color-error); }

.result-label {
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: -6px;
}

#result-title {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
}

#result-category,
#result-priority {
  font-size: 1rem;
  font-weight: 600;
}

#result-summary {
  font-size: 0.95rem;
  line-height: 1.5;
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

#result-materials-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#result-materials {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.material-pill {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--color-text);
}

#result-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 4px 0;
}

#result-meta-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#webhook-status {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
}

#result-trello-note {
  font-size: 0.75rem;
  color: var(--color-muted);
}

#result-worker-input-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#result-transcript {
  font-size: 0.85rem;
  color: var(--color-muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

/* ═══════════════════════════════════════════
   SHARED BUTTON — OUTLINED (restart / error-restart)
═══════════════════════════════════════════ */
#restart-btn,
#error-restart-btn {
  width: 100%;
  padding: 14px;
  border: 2px solid var(--color-accent);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-main);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  min-height: 52px;
}

#restart-btn:hover,
#error-restart-btn:hover {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

/* ═══════════════════════════════════════════
   ERROR PANEL
═══════════════════════════════════════════ */
#error-panel {
  flex-direction: column;
  gap: 16px;
  padding-top: 32px;
}

#error-message {
  font-size: 1rem;
  line-height: 1.5;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-error);
  border-radius: var(--radius);
  color: var(--color-on-error);
}

/* ═══════════════════════════════════════════
   SHARED UTILITY
═══════════════════════════════════════════ */
.panel-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```
