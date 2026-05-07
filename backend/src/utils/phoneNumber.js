/**
 * Phone number normalization for the messaging app.
 *
 * Customer phones land in our DB from two paths:
 *   - operator types one in the Send Message UI: e.g. `+91 8558 815 223`
 *   - Meta delivers it via the inbound webhook: `918558815223` (digits only,
 *     no leading '+')
 *
 * Without normalization, the same physical customer ends up in two separate
 * conversation buckets in chatService.listConversations (GROUP BY phone).
 *
 * Canonical form: digits only, no '+', no spaces, no hyphens. Equivalent
 * across both paths.
 */
function normalizePhone(p) {
  return (p == null ? '' : String(p)).replace(/[^\d]/g, '');
}

module.exports = { normalizePhone };
