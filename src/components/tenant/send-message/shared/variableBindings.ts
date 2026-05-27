import type { Recipient } from '../types';

// A placeholder value can be either a literal string the operator typed, OR a
// "binding token" that points at a per-recipient field on the Recipient object.
// Tokens look like "{{contact.name}}" / "{{contact.phone}}" / etc. The bulk
// send path expands them per-recipient before posting to the backend, so each
// outgoing message gets personalized with the right contact's data.

export const CONTACT_FIELDS: { value: keyof Recipient; label: string }[] = [
  { value: 'name', label: 'Contact name' },
  { value: 'phone', label: 'Contact phone' },
  { value: 'email', label: 'Contact email' },
];

const BINDING_RE = /^\{\{contact\.(\w+)\}\}$/;

export function bindContactField(field: keyof Recipient): string {
  return `{{contact.${field}}}`;
}

export function isContactBinding(value: unknown): value is string {
  return typeof value === 'string' && BINDING_RE.test(value);
}

export function parseContactBinding(value: unknown): keyof Recipient | null {
  if (typeof value !== 'string') return null;
  const m = value.match(BINDING_RE);
  if (!m) return null;
  return m[1] as keyof Recipient;
}

export function fieldLabel(field: keyof Recipient): string {
  const f = CONTACT_FIELDS.find((c) => c.value === field);
  return f ? f.label : String(field);
}

// Resolve every binding token in `placeholders` against this one recipient.
// Anything not a binding token is passed through unchanged. Missing fields
// on the recipient (e.g. contact has no name saved) resolve to '' so the
// outbound message just shows a blank where the variable would have been —
// matches the user's requirement: "if not available then blank".
export function resolveContactBindings(
  placeholders: { [k: string]: string },
  recipient: Recipient
): { [k: string]: string } {
  const out: { [k: string]: string } = {};
  for (const [key, val] of Object.entries(placeholders || {})) {
    const field = parseContactBinding(val);
    if (field) {
      const v = recipient[field];
      out[key] = v == null ? '' : String(v);
    } else {
      out[key] = val == null ? '' : String(val);
    }
  }
  return out;
}
