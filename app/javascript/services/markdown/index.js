// Common Markdown rendering utility
export function renderMarkdown(text) {
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Lists
    .replace(/^\- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return '<ul>' + match.replace(/\n$/, '') + '</ul>';
  });

  // Wrap paragraphs (but not already wrapped content)
  const lines = html.split('\n');
  let result = '';
  let currentParagraph = '';

  lines.forEach(line => {
    if (line.trim() === '') {
      if (currentParagraph.trim()) {
        // Wrap only if not already an HTML tag
        if (!currentParagraph.trim().startsWith('<')) {
          result += '<p>' + currentParagraph.trim() + '</p>\n';
        } else {
          result += currentParagraph + '\n';
        }
        currentParagraph = '';
      }
    } else if (line.startsWith('<')) {
      if (currentParagraph.trim() && !currentParagraph.trim().startsWith('<')) {
        result += '<p>' + currentParagraph.trim() + '</p>\n';
        currentParagraph = '';
      }
      result += line + '\n';
    } else {
      currentParagraph += line + ' ';
    }
  });

  if (currentParagraph.trim()) {
    if (!currentParagraph.trim().startsWith('<')) {
      result += '<p>' + currentParagraph.trim() + '</p>';
    } else {
      result += currentParagraph;
    }
  }

  return result || html;
}

export default { renderMarkdown };


