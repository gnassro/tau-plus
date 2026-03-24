export class CodeEditor {
  constructor(chatInput) {
    this.chatInput = chatInput;
    this.editorCode = document.getElementById('editor-code');
    this.floatingAddBtn = document.getElementById('floating-add-btn');
    this.currentSelection = null;

    this.bindEvents();
  }

  getSelectionLineNumbers(preElement) {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    
    if (!preElement.contains(range.commonAncestorContainer)) return null;

    const preRange = document.createRange();
    preRange.selectNodeContents(preElement);
    preRange.setEnd(range.startContainer, range.startOffset);
    
    const textBefore = preRange.toString();
    const startLine = textBefore.split('\n').length;
    
    const selectedText = range.toString();
    const endLine = startLine + selectedText.split('\n').length - 1;
    
    return { startLine, endLine, text: selectedText, range };
  }

  bindEvents() {
    document.addEventListener('selectionchange', () => {
      if (!this.editorCode || !this.floatingAddBtn) return;
      const selData = this.getSelectionLineNumbers(this.editorCode);
      
      if (selData && selData.text.trim().length > 0) {
        this.currentSelection = selData;
        const rects = selData.range.getClientRects();
        if (rects.length > 0) {
          const rect = rects[0];
          this.floatingAddBtn.style.left = (rect.left + rect.width / 2) + 'px';
          this.floatingAddBtn.style.top = rect.top + 'px';
          this.floatingAddBtn.classList.remove('hidden');
        }
      } else {
        this.currentSelection = null;
        this.floatingAddBtn.classList.add('hidden');
      }
    });

    if (this.floatingAddBtn) {
      this.floatingAddBtn.addEventListener('mousedown', (e) => { e.preventDefault(); }); // Prevent losing messageInput focus
      this.floatingAddBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.currentSelection) return;
        
        const editorPane = document.getElementById('editor-pane');
        const fullPath = editorPane.getAttribute('data-path');
        if (!fullPath) return;
        
        const fileName = fullPath.split('/').pop();
        const lines = `${this.currentSelection.startLine}-${this.currentSelection.endLine}`;
        const snippetEncoded = encodeURIComponent(this.currentSelection.text);
        
        const chipHtml = `<span class="context-chip snippet-chip" data-type="snippet" contenteditable="false" data-path="${fullPath}" data-lines="${lines}" data-snippet="${snippetEncoded}">${fileName} (${lines})<button type="button" class="remove-chip" tabindex="-1" onclick="this.parentElement.remove(); document.getElementById('message-input').focus();" aria-label="Remove context"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span>&nbsp;`;
          
        this.chatInput.insertHtmlAtCursor(chipHtml);
        this.floatingAddBtn.classList.add('hidden');
        
        window.getSelection().removeAllRanges();
      });
    }
  }
}
