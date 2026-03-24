export class Autocomplete {
  constructor(chatInput) {
    this.chatInput = chatInput;
    this.projectFilesCache = null;
    this.active = false;
    this.selectedIndex = 0;
    this.filteredFiles = [];

    this.dropdown = document.createElement('div');
    this.dropdown.id = 'autocomplete-dropdown';
    this.dropdown.className = 'autocomplete-dropdown hidden';
    document.querySelector('.input-bubble').appendChild(this.dropdown);

    this.bindEvents();
  }

  bindEvents() {
    this.chatInput.element.addEventListener('input', async () => {
      let currentWord = '';
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && this.chatInput.element.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textBeforeCursor = range.startContainer.textContent.substring(0, range.startOffset);
          const words = textBeforeCursor.split(/[\s\n]+/);
          currentWord = words[words.length - 1];
        }
      }

      if (currentWord.startsWith('@')) {
        const query = currentWord.substring(1).toLowerCase();
        const files = await this.fetchProjectFiles();
        
        this.filteredFiles = files.filter(f => f.toLowerCase().includes(query)).slice(0, 50);
        
        if (this.filteredFiles.length > 0) {
          this.active = true;
          this.chatInput.setAutocompleteActive(true);
          this.selectedIndex = 0;
          this.updateDropdown();
        } else {
          this.close();
        }
      } else {
        this.close();
      }
    });

    this.chatInput.element.addEventListener('keydown', (e) => {
      if (this.active) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex + 1) % this.filteredFiles.length;
          this.updateDropdown();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex - 1 + this.filteredFiles.length) % this.filteredFiles.length;
          this.updateDropdown();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.insertFile(this.filteredFiles[this.selectedIndex]);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      }
    });
  }

  async fetchProjectFiles() {
    if (this.projectFilesCache) return this.projectFilesCache;
    try {
      const resp = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'get_project_files' })
      });
      const data = await resp.json();
      if (data.success && data.data && data.data.files) {
        this.projectFilesCache = data.data.files;
        return this.projectFilesCache;
      }
    } catch (err) {
      console.error('[Autocomplete] Failed to fetch project files', err);
    }
    return [];
  }

  close() {
    this.active = false;
    this.chatInput.setAutocompleteActive(false);
    this.dropdown.classList.add('hidden');
    this.dropdown.innerHTML = '';
  }

  updateDropdown() {
    if (!this.active || this.filteredFiles.length === 0) {
      this.close();
      return;
    }
    
    this.dropdown.innerHTML = '';
    this.dropdown.classList.remove('hidden');
    
    this.filteredFiles.forEach((file, index) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item' + (index === this.selectedIndex ? ' active' : '');
      div.textContent = file;
      div.onmousedown = (e) => {
        e.preventDefault();
        this.insertFile(file);
      };
      this.dropdown.appendChild(div);
    });

    const activeItem = this.dropdown.querySelector('.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  insertFile(file) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const text = range.startContainer.textContent.substring(0, range.startOffset);
      const match = text.match(/@([^\s]*)$/);
      if (match) {
        // Delete the typed @word
        range.setStart(range.startContainer, range.startOffset - match[0].length);
        range.deleteContents();
        
        const fileName = file.split('/').pop();
        const chipHtml = `<span class="context-chip" contenteditable="false" data-path="${file}">${fileName}<button type="button" class="remove-chip" tabindex="-1" onclick="this.parentElement.remove(); document.getElementById('message-input').focus();" aria-label="Remove context"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>&nbsp;`;
        
        // Use ChatInput to safely insert
        this.chatInput.lastSavedRange = range;
        this.chatInput.insertHtmlAtCursor(chipHtml);
      }
    }
    this.close();
  }
}
