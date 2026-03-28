---
description: Describes the web UI architecture and interaction with the DOM in the Tau-plus mirror project.
---

# Tau-plus Web UI Architecture Skill

When asked to modify the web UI of the Tau-plus mirror project, you MUST understand how the ES6 modules interact with the DOM to prevent breaking the layout or the rich-text editor.

1. **The `contenteditable` Chat Input**:
   - Located in `public/chat-input.js`. 
   - NEVER query `document.getElementById('message-input').value`. It is a `contenteditable` div, not a `<textarea>`.
   - To get the text containing formatted context chips (like `@file.js`), call `chatInput.getText()` which safely parses DOM nodes into structured markdown text before sending to the backend.
   - It maintains its own cursor state (`this.lastSavedRange`) so that other modules can inject UI chips without the user losing their typing position.

2. **Autocomplete and Code Editor**:
   - `public/autocomplete.js` and `public/code-editor.js` DO NOT interact with the WebSocket or the backend directly (except for the `/api/rpc` file fetch).
   - When they need to add a chip into the chat, they call `this.chatInput.insertHtmlAtCursor(chipHtml)`. They do not manipulate the DOM of the input box directly.

3. **Backend Communication**:
   - `extensions/mirror-server.ts` handles all backend API routes.
   - It intercepts specific WebSocket commands (like `get_project_files` or `switch_session`) and passes everything else through the Extension API's `pi.sendUserMessage()`.
   - Modifying how messages are sent requires updating `sendMessage()` inside `public/app.js`, NOT `public/chat-input.js`. The input class just fires the `onSubmit(text)` callback.

Use this knowledge whenever you are tasked with adding a new UI button, adding a new context chip type, or fixing layout bugs in the 3-pane structure.