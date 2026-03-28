export class CodeEditor {
  constructor(chatInput) {
    this.chatInput = chatInput;
    this.editorCode = document.getElementById('editor-code');
    this.editorTabs = document.getElementById('editor-tabs');
    this.floatingAddBtn = document.getElementById('floating-add-btn');
    this.editorPane = document.getElementById('editor-pane');
    
    this.tabs = []; // Array of { path, name, content, originalContent, isUnsaved }
    this.activeTabPath = null;
    this.currentSelection = null;

    this.bindEvents();
    
    // Mount globally so FileBrowser can access it easily
    window.codeEditor = this;
  }

  async openFile(path, name) {
    let tab = this.tabs.find(t => t.path === path);
    if (!tab) {
      try {
        const res = await fetch('/api/read?path=' + encodeURIComponent(path));
        if (!res.ok) throw new Error('Failed to read file');
        const text = await res.text();
        tab = { path, name, content: text, originalContent: text, isUnsaved: false };
        this.tabs.push(tab);
      } catch (err) {
        console.error('Error loading file', err);
        return;
      }
    }
    this.setActiveTab(path);
  }

  setActiveTab(path) {
    this.activeTabPath = path;
    const tab = this.tabs.find(t => t.path === path);
    if (!tab) return;
    
    this.editorPane.setAttribute('data-path', path);
    this.editorCode.value = tab.content;
    this.editorCode.disabled = false;
    
    this.renderTabs();
    this.hideFloatingBtn();
  }

  closeTab(path) {
    const index = this.tabs.findIndex(t => t.path === path);
    if (index === -1) return;
    
    if (this.tabs[index].isUnsaved) {
      if (!confirm(`Discard unsaved changes in ${this.tabs[index].name}?`)) {
        return;
      }
    }

    this.tabs.splice(index, 1);
    
    if (this.tabs.length === 0) {
      this.activeTabPath = null;
      this.editorPane.removeAttribute('data-path');
      this.editorCode.value = '';
      this.editorCode.disabled = true;
      this.editorCode.placeholder = 'Select a file to view';
      this.renderTabs();
      this.hideFloatingBtn();
    } else if (this.activeTabPath === path) {
      const nextIndex = Math.max(0, index - 1);
      this.setActiveTab(this.tabs[nextIndex].path);
    } else {
      this.renderTabs();
    }
  }

  renderTabs() {
    this.editorTabs.innerHTML = '';
    this.tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = `editor-tab ${tab.path === this.activeTabPath ? 'active' : ''} ${tab.isUnsaved ? 'unsaved' : ''}`;
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = tab.name;
      nameSpan.onclick = () => this.setActiveTab(tab.path);
      el.appendChild(nameSpan);

      const closeBtn = document.createElement('span');
      closeBtn.className = 'editor-tab-close';
      closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.closeTab(tab.path);
      };
      el.appendChild(closeBtn);

      this.editorTabs.appendChild(el);
    });
  }

  async saveActiveTab() {
    const tab = this.tabs.find(t => t.path === this.activeTabPath);
    if (!tab || !tab.isUnsaved) return;
    
    try {
      await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: tab.path, content: tab.content })
      });
      tab.originalContent = tab.content;
      tab.isUnsaved = false;
      this.renderTabs();
    } catch (err) {
      console.error('Failed to save file:', err);
      alert('Failed to save file');
    }
  }

  getSelectionLineNumbers() {
    if (!this.editorCode || this.editorCode.disabled) return null;
    const start = this.editorCode.selectionStart;
    const end = this.editorCode.selectionEnd;
    if (start === end) return null;

    const textBefore = this.editorCode.value.substring(0, start);
    const startLine = textBefore.split('\n').length;
    
    const selectedText = this.editorCode.value.substring(start, end);
    const endLine = startLine + selectedText.split('\n').length - 1;
    
    return { startLine, endLine, text: selectedText };
  }

  hideFloatingBtn() {
    this.currentSelection = null;
    if (this.floatingAddBtn) this.floatingAddBtn.classList.add('hidden');
  }

  bindEvents() {
    this.editorCode.addEventListener('input', () => {
      const tab = this.tabs.find(t => t.path === this.activeTabPath);
      if (tab) {
        tab.content = this.editorCode.value;
        const unsaved = tab.content !== tab.originalContent;
        if (tab.isUnsaved !== unsaved) {
          tab.isUnsaved = unsaved;
          this.renderTabs();
        }
      }
      this.hideFloatingBtn();
    });

    this.editorCode.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveActiveTab();
      }
      
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editorCode.selectionStart;
        const end = this.editorCode.selectionEnd;
        const value = this.editorCode.value;
        this.editorCode.value = value.substring(0, start) + '  ' + value.substring(end);
        this.editorCode.selectionStart = this.editorCode.selectionEnd = start + 2;
        
        this.editorCode.dispatchEvent(new Event('input'));
      }
    });

    document.addEventListener('selectionchange', () => {
      if (document.activeElement !== this.editorCode) return;
      
      const selData = this.getSelectionLineNumbers();
      if (selData && selData.text.trim().length > 0) {
        this.currentSelection = selData;
        
        if (this.floatingAddBtn) {
          this.floatingAddBtn.style.top = '10px';
          this.floatingAddBtn.style.right = '20px';
          this.floatingAddBtn.style.left = 'auto'; 
          this.floatingAddBtn.style.position = 'absolute';
          this.floatingAddBtn.classList.remove('hidden');
        }
      } else {
        this.hideFloatingBtn();
      }
    });

    this.editorCode.addEventListener('mouseup', () => {
      const selData = this.getSelectionLineNumbers();
      if (!selData || selData.text.trim().length === 0) {
        this.hideFloatingBtn();
      }
    });

    if (this.floatingAddBtn) {
      this.floatingAddBtn.addEventListener('mousedown', (e) => { e.preventDefault(); });
      this.floatingAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.currentSelection || !this.activeTabPath) return;
        
        const fullPath = this.activeTabPath;
        const fileName = fullPath.split('/').pop();
        const lines = `${this.currentSelection.startLine}-${this.currentSelection.endLine}`;
        const snippetEncoded = encodeURIComponent(this.currentSelection.text);
        
        const chipHtml = `<span class="context-chip snippet-chip" data-type="snippet" contenteditable="false" data-path="${fullPath}" data-lines="${lines}" data-snippet="${snippetEncoded}">${fileName} (${lines})<button type="button" class="remove-chip" tabindex="-1" onclick="this.parentElement.remove(); document.getElementById('message-input').focus();" aria-label="Remove context"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>&nbsp;`;
          
        this.chatInput.insertHtmlAtCursor(chipHtml);
        this.hideFloatingBtn();
        
        this.editorCode.selectionStart = this.editorCode.selectionEnd;
      });
    }
  }
}