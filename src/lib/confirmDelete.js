/**
 * "Type the name to delete" for anything that cannot be put back. Returns the typed name (which the server checks again and
 * requires in `?confirm=`), or null when the admin cancels or mistypes. A plain OK button is too easy to click through.
 */
export function typeToConfirm(what, name) {
  const typed = window.prompt(`${what}\n\nIt is removed from the site but archived (kept in the database), not erased. To confirm, type the exact name below:\n\n${name}`, '');
  if (typed === null) return null;
  if (typed.trim().toLowerCase() !== String(name).trim().toLowerCase()) {
    window.alert('That did not match, so nothing was deleted.');
    return null;
  }
  return typed.trim();
}

/** Appends ?confirm=... to an API path. */
export const withConfirm = (path, confirm) => `${path}?confirm=${encodeURIComponent(confirm ?? '')}`;
