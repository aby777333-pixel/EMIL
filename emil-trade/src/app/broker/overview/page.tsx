import { redirect } from 'next/navigation';

// The broker back-office has moved to the GIO4X portal staff console
// (JUNE 2026 → zippy-piroshki). The terminal is trader-only; this legacy
// broker dashboard now points to the real Command Centre. Redirect stub
// (kept rather than deleting the route dir — see the Netlify dir-deletion gotcha).
export default function BrokerOverviewMoved() {
  redirect('https://zippy-piroshki-21aa30.netlify.app/staff/command');
}
