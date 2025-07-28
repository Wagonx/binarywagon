/**
 * Utils - Updated for modern browsers
 */

// Add code-copy buttons using progressive enhancement
// Updated to use modern Clipboard API with fallback
(function() {
    'use strict';
  
    // Check for clipboard support (modern API or legacy)
    if (!navigator.clipboard && !document.queryCommandSupported) {
      return;
    }
  
    function flashCopyMessage(el, msg) {
      el.textContent = msg;
      setTimeout(function() {
        el.textContent = "Copy";
      }, 1000);
    }
  
    function selectText(node) {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
      return selection;
    }
  
    function getCodeText(codeEl) {
      // Handle table-based line numbering (Hugo's lineNumbersInTable option)
      if (codeEl.firstElementChild instanceof HTMLTableElement) {
        var codeColumn = codeEl.firstElementChild.firstElementChild.firstElementChild.lastElementChild;
        return codeColumn.textContent;
      } else {
        // Handle regular code blocks and inline line numbers
        var text = codeEl.textContent;
        // Remove line numbers if present (numbers at start of lines)
        return text.replace(/^\s*\d+\s*/gm, '');
      }
    }
  
    async function copyToClipboard(text, button) {
      try {
        if (navigator.clipboard) {
          // Modern Clipboard API
          await navigator.clipboard.writeText(text);
          flashCopyMessage(button, 'Copied!');
        } else {
          // Fallback for older browsers
          fallbackCopyTextToClipboard(text, button);
        }
      } catch (err) {
        console.error('Failed to copy: ', err);
        fallbackCopyTextToClipboard(text, button);
      }
    }
  
    function fallbackCopyTextToClipboard(text, button) {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Make the textarea invisible but accessible
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
  
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
  
      try {
        var successful = document.execCommand && document.execCommand('copy');
        if (successful) {
          flashCopyMessage(button, 'Copied!');
        } else {
          flashCopyMessage(button, 'Failed :(');
        }
      } catch (err) {
        console.error('Fallback: Unable to copy', err);
        flashCopyMessage(button, 'Failed :(');
      }
  
      document.body.removeChild(textArea);
    }
  
    function addCopyButton(containerEl) {
      var copyBtn = document.createElement("button");
      copyBtn.className = "highlight-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.type = "button"; // Prevent form submission if inside a form
  
      var codeEl = containerEl.firstElementChild;
      
      copyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        try {
          var textToCopy = getCodeText(codeEl);
          copyToClipboard(textToCopy, copyBtn);
        } catch(error) {
          console.error('Copy operation failed:', error);
          flashCopyMessage(copyBtn, 'Failed :(');
        }
      });
  
      containerEl.appendChild(copyBtn);
    }
  
    // Initialize when DOM is ready
    function initializeCopyButtons() {
      var highlightBlocks = document.getElementsByClassName('highlight');
      Array.prototype.forEach.call(highlightBlocks, addCopyButton);
    }
  
    // Run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeCopyButtons);
    } else {
      initializeCopyButtons();
    }
  })();