import { redirect } from 'next/navigation';

// Symbol / group configuration now lives in the canonical Broker Controls
// console in the GIO4X portal staff area (JUNE 2026 → zippy-piroshki/staff/broker),
// which writes the live instruments table with a full audit trail and group
// standards. This legacy terminal page is retired to a redirect stub.
export default function BrokerSymbolsMoved() {
  redirect('https://zippy-piroshki-21aa30.netlify.app/staff/broker');
}
