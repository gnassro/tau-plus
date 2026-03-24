const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Extract sidebar (session list)
const sidebarStart = html.indexOf('    <!-- Left Sidebar -->');
const sidebarEnd = html.indexOf('    <!-- Sidebar overlay for mobile -->');
const sidebarHtml = html.substring(sidebarStart, sidebarEnd);
html = html.replace(sidebarHtml, '');

// 2. Insert sidebar into settings
const settingsBodyStart = html.indexOf('<div class="settings-body">') + '<div class="settings-body">'.length;
const sessionSettingsHtml = `\n      <div class="settings-section">
        <div class="settings-section-title">Session History</div>
        <div class="session-history-container" style="max-height: 300px; overflow-y: auto;">
          ${sidebarHtml.replace('id="sidebar"', 'id="sidebar" style="width:100%; height:auto;"')}
        </div>
      </div>`;
html = html.substring(0, settingsBodyStart) + sessionSettingsHtml + html.substring(settingsBodyStart);

// 3. Extract file-sidebar
const fileSidebarStart = html.indexOf('    <!-- File Browser (right sidebar) -->');
const fileSidebarEnd = html.indexOf('  </div>\n\n  <!-- Settings Overlay -->');
let fileSidebarHtml = html.substring(fileSidebarStart, fileSidebarEnd);
html = html.replace(fileSidebarHtml, '');

// Remove "collapsed" from file-sidebar by default so it shows on left
fileSidebarHtml = fileSidebarHtml.replace('class="file-sidebar collapsed"', 'class="file-sidebar"');

// 4. Create editor pane
const editorPaneHtml = `    <!-- Editor Pane (Center) -->
    <div class="editor-pane" id="editor-pane">
      <div class="editor-header">
        <span id="editor-filename">Welcome</span>
      </div>
      <div class="editor-content">
        <pre><code id="editor-code">Select a file to view</code></pre>
      </div>
    </div>\n`;

// 5. Reconstruct app-layout
const appLayoutStart = html.indexOf('<div class="app-layout">') + '<div class="app-layout">'.length;
html = html.substring(0, appLayoutStart) + '\n' + fileSidebarHtml + '\n' + editorPaneHtml + html.substring(appLayoutStart);

fs.writeFileSync('public/index.html', html);
console.log('rewrote index.html');
