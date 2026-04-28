/**
 * Accessibility Utilities
 * Provides helpers for WCAG 2.1 compliance and keyboard navigation
 */

// Trap focus within a modal or dialog
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        e.preventDefault();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  firstFocusable?.focus();
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

// Announce to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Check color contrast ratio (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Simple RGB to luminance calculation
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
    const [r, g, b] = rgb.map(val => {
      const normalized = val / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Generate unique ID for aria-describedby and aria-labelledby
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

// Keyboard navigation helper
export function handleKeyboardNavigation(
  e: React.KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
): void {
  let newIndex = currentIndex;
  
  switch (e.key) {
    case 'ArrowDown':
    case 'Down':
      e.preventDefault();
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'ArrowUp':
    case 'Up':
      e.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      break;
    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      newIndex = items.length - 1;
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      onSelect(currentIndex);
      return;
    case 'Escape':
    case 'Esc':
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur();
      return;
    default:
      return;
  }
  
  items[newIndex]?.focus();
  onSelect(newIndex);
}

// Skip to main content helper
export function addSkipLink(): void {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg';
  skipLink.textContent = 'Skip to main content';
  
  document.body.insertBefore(skipLink, document.body.firstChild);
}

// Focus visible helper (for custom focus indicators)
export function setupFocusVisible(): void {
  let hadKeyboardEvent = false;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      hadKeyboardEvent = true;
    }
  };
  
  const handlePointerDown = () => {
    hadKeyboardEvent = false;
  };
  
  const handleFocus = (e: FocusEvent) => {
    if (hadKeyboardEvent && e.target) {
      (e.target as HTMLElement).setAttribute('data-focus-visible', 'true');
    }
  };
  
  const handleBlur = (e: FocusEvent) => {
    if (e.target) {
      (e.target as HTMLElement).removeAttribute('data-focus-visible');
    }
  };
  
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('mousedown', handlePointerDown, true);
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
}

// ARIA label helpers
export function getAriaLabel(element: string, action?: string): string {
  const labels: { [key: string]: string } = {
    'close': 'Close',
    'menu': 'Menu',
    'search': 'Search',
    'filter': 'Filter',
    'sort': 'Sort',
    'edit': 'Edit',
    'delete': 'Delete',
    'add': 'Add',
    'save': 'Save',
    'cancel': 'Cancel',
    'submit': 'Submit',
    'next': 'Next',
    'previous': 'Previous',
    'open': 'Open',
  };
  
  const label = labels[element.toLowerCase()] || element;
  return action ? `${label} ${action}` : label;
}

// Screen reader only CSS class helper
export const srOnlyStyles = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  borderWidth: '0',
};
