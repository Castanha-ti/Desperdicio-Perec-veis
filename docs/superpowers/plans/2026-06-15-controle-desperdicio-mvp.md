# Controle de Desperdicio MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static manual waste-entry form that writes to the approved Google Sheet through Google Apps Script.

**Architecture:** A static HTML/CSS/JS frontend validates and submits one item per request. A Google Apps Script Web App validates the payload, ensures the expected sheet columns exist, and appends the row to `Pagina1`.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Google Apps Script, Google Sheets.

---

### Task 1: Static Frontend

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/app.js`
- Create: `src/config.example.js`
- Create: `src/config.js`

- [x] Build the form with fields for setor, data, item, codigo, quantity mode, quantity, preco unitario, motivo, and observacao.
- [x] Add client validation for required fields, numeric values, and exactly one quantity type.
- [x] Submit JSON to the configured Apps Script URL.
- [x] Show success, error, loading, and last-entry states.

### Task 2: Apps Script Endpoint

**Files:**
- Create: `apps-script/Code.gs`

- [x] Add constants for spreadsheet id, sheet name, headers, sectors, and reasons.
- [x] Implement `doPost(e)` to parse, validate, and append one row.
- [x] Implement `setupSheet()` to prepare the sheet columns.
- [x] Preserve existing rows by inserting `SETOR` before `ITEM` when needed.

### Task 3: Documentation And Verification

**Files:**
- Create: `README.md`
- Create: `package.json`
- Create: `tests/app.test.js`

- [x] Document Apps Script deployment and frontend configuration.
- [x] Add lightweight Node tests for number parsing and validation.
- [x] Run the local tests.
