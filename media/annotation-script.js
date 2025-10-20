// @ts-check

(function () {
  const vscode = acquireVsCodeApi();

  // Elements
  const form = document.getElementById("annotationForm");
  const commentTextarea = document.getElementById("comment");
  const charCount = document.querySelector(".char-count");
  const cancelBtn = document.getElementById("cancelBtn");
  const tagsInput = document.getElementById("tags");

  // Constants
  const MAX_CHARS = 500;

  // Initialize
  initializeEventListeners();
  setFocus();

  function initializeEventListeners() {
    // Form submission
    if (form) form.addEventListener("submit", handleFormSubmit);

    // Cancel button
    if (cancelBtn) cancelBtn.addEventListener("click", handleCancel);

    // Character count
    if (commentTextarea)
      commentTextarea.addEventListener("input", updateCharCount);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl+Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleFormSubmit(new Event("submit"));
      }

      // Escape to cancel
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    });
  }

  function setFocus() {
    // Focus on the comment textarea for immediate user input
    if (commentTextarea) {
      commentTextarea.focus();
      // Move cursor to the end
      commentTextarea.setSelectionRange(
        commentTextarea.value.length,
        commentTextarea.value.length
      );
    }
  }

  function updateCharCount() {
    if (!commentTextarea || !charCount) return;

    const length = commentTextarea.value.length;
    const isOverLimit = length > MAX_CHARS;

    charCount.textContent = `${length} / ${MAX_CHARS} characters`;

    if (isOverLimit) {
      charCount.style.color = "var(--color-error)";
      commentTextarea.value = commentTextarea.value.substring(0, MAX_CHARS);
    } else if (length > MAX_CHARS * 0.8) {
      charCount.style.color = "var(--color-warning)";
    } else {
      charCount.style.color = "var(--color-text-secondary)";
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    if (!commentTextarea || !tagsInput) return;

    const comment = commentTextarea.value.trim();
    const tags = tagsInput.value.trim();

    // Validation
    if (!comment) {
      showError("Please enter a comment");
      return;
    }

    if (comment.length < 3) {
      showError("Comment must be at least 3 characters");
      return;
    }

    // Send message to extension
    vscode.postMessage({
      command: "submit",
      comment: comment,
      tags: tags,
    });
  }

  function handleCancel() {
    vscode.postMessage({
      command: "cancel",
    });
  }

  function showError(message) {
    // Create a simple error notification
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
            background-color: #dc3545;
            color: white;
            padding: 12px 16px;
            margin-bottom: 16px;
            border-radius: 4px;
            font-size: 12px;
            animation: slideIn 0.3s ease-out;
        `;
    errorDiv.textContent = message;

    const container = document.querySelector(".container");
    if (container) {
      container.insertBefore(errorDiv, container.firstChild);
    }

    // Remove error after 4 seconds
    setTimeout(() => {
      errorDiv.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => {
        errorDiv.remove();
      }, 300);
    }, 4000);
  }
})();

// CSS animations for error messages
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);
