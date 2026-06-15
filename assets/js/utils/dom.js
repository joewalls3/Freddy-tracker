export const select = (selector, root = document) => root.querySelector(selector);
export const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

export function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function make(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) element.setAttribute(name, String(value));
    }
  }
  return element;
}
