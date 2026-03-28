# Tau-plus Mirror Project - AI Agent Guidelines

*Note: This project is a fork of the original [tau](https://github.com/deflating/tau) project.*

Welcome, future AI Agent! This project is the web UI ("Mirror") for the Pi Coding Agent. It allows users to view and interact with their terminal-based Pi sessions from a browser.

**CRITICAL DIRECTIVE: ALWAYS UPDATE DOCUMENTATION**
Whenever you make structural changes to the UI, add new features, or refactor core logic, you MUST update this `.pi/AGENTS.md` file and the `README.md` to reflect those changes. Do not leave the documentation out of sync with the codebase.

## Project Architecture

This is NOT an RPC wrapper. It is a native Pi extension.

The project is split into two halves:
1. **Backend Extension (`extensions/mirror-server.ts`)**: Runs natively inside the active `pi` process via the Extension API. It spins up an HTTP/WebSocket server to serve the static frontend files, intercept API calls, and stream Pi events/state to the browser.
2. **Frontend UI (`public/`)**: The web interface the user interacts with.

### Frontend Structure (Refactored 2026-03)
The frontend uses an **Antigravity/Cursor IDE 3-Pane Layout**.
*   **Left Pane**: File explorer (`#file-sidebar`). Controlled by `public/file-browser.js`.
*   **Center Pane**: Read-only code editor (`#editor-pane`). Displays file contents clicked in the left pane.
*   **Right Pane**: Main chat window (`.main`).
*   **Settings**: General UI settings, accessed via the gear icon.
*   **History**: A dedicated modal overlay (`#history-panel`) that strictly filters session history by the Current Working Directory (`cwd`). Accessed via the clock icon.

### Core Modules (ES6 Classes)
We moved away from a monolithic `app.js` toward modular, object-oriented ES6 classes:
*   `public/app.js`: The main coordinator. Instantiates components, handles WebSockets (`public/websocket-client.js`), and manages global state.
*   `public/chat-input.js`: (`ChatInput` class). Manages the `contenteditable` rich-text chat box. Handles `Shift+Enter`, HTML stripping on paste, cursor tracking, and parsing UI chips back to raw text.
*   `public/autocomplete.js`: (`Autocomplete` class). Listens for `@` mentions, fetches project files via RPC, renders the dropdown, and handles keyboard navigation.
*   `public/code-editor.js`: (`CodeEditor` class). Manages the center pane. Calculates selected line numbers mathematically and renders the floating "Add to Chat" button for inline context chips.
*   `public/session-sidebar.js`: Displays session history for the current project. Sessions are loaded server-side via `SessionManager.list(cwd)`.

## Development Rules

1. **Inline Context Chips**: The chat input is NOT a `<textarea>`. It is a `<div contenteditable="true">`. File mentions and code snippets are rendered as HTML `<span class="context-chip">` elements inline with the text. If you need to read the text, use `chatInput.getText()` which safely parses the HTML chips back into `@file/path` or markdown blocks. Do NOT use `.value` or `.innerText` blindly.
2. **Session Switching**: Session switching is done **in-process** via Pi's native `AgentSession.switchSession()`. When the user clicks a session in the sidebar, the frontend sends a `switch_session` WebSocket command. The backend calls `switchSessionFn` (captured from `ExtensionCommandContext`), which triggers Pi's `session_switch` event. The event handler broadcasts a fresh `mirror_sync` snapshot to all browser clients — no page reload, no redirect, no new terminal window. The `/tau-plus-resume` command is also available from the Pi TUI for manual switching.
3. **Session Listing**: The backend uses `SessionManager.list(process.cwd())` from `@mariozechner/pi-coding-agent` to list only sessions belonging to the current project directory. No client-side cwd filtering is needed.
4. **Styling**: Always use the defined CSS variables in `public/style.css` (e.g., `var(--bg-solid)`, `var(--text-primary)`, `var(--border)`). Flexbox heavily dictates the 3-pane layout, so be careful not to trigger `flex-shrink` collapse on `.main`.
5. **Chat Messages & Typing Indicator**: The chat interface avoids restricted container widths for AI responses. Assistant messages use a `.message-actions-row` above the text, allowing `.message-content` to span the full 100% width. The dynamic typing indicator (showing "Thinking..." or "Working (bash)") is appended directly into the `#messages` container so it flows naturally in the chat log, rather than floating awkwardly outside of it.
