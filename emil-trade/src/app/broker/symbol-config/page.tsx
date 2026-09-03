import { redirect } from 'next/navigation';

// Symbol / group configuration has moved to the canonical Broker Control Center
// in the GIO4X portal staff console (zippy-piroshki → /staff/broker), which
// writes the live instruments table with a full audit trail and now includes
// group standards (bulk apply). This terminal route is retired; redirect to the
// broker overview so any bookmarked link still lands somewhere sensible.
// (Kept as a redirect stub rather than deleting the route dir — see the Netlify
// dir-deletion gotcha.)
export default function SymbolConfigMoved() {
  redirect('/broker');
}
