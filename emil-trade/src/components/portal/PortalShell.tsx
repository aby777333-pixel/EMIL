'use client';

import PortalSidebar from './PortalSidebar';
import PortalTopBar from './PortalTopBar';
import PortalMobileNav from './PortalMobileNav';
import VerificationBanner from './VerificationBanner';

type KycStatus =
  | 'unverified'
  | 'pending_basic'
  | 'pending_enhanced'
  | 'verified'
  | 'tier2_verified'
  | 'rejected'
  | 'suspended';

interface PortalShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  kycStatus?: KycStatus;
}

/**
 * Authenticated portal shell — sidebar (left) + topbar (top) + canvas.
 * Wraps the entire authenticated surface in `.gentleman` so the
 * institutional design tokens apply, while leaving inner content's
 * existing tokens intact (the trading platform & dealer have their
 * own shell and aren't routed through here).
 */
export default function PortalShell({
  children,
  userName,
  userEmail,
  kycStatus = 'unverified',
}: PortalShellProps) {
  return (
    <div
      className="gentleman flex h-screen w-full overflow-hidden"
      style={{ background: 'var(--g-bg-void)' }}
    >
      <PortalSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <PortalTopBar userName={userName} userEmail={userEmail} />
        <VerificationBanner status={kycStatus} />

        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-6"
          style={{ background: 'var(--g-bg-void)' }}
        >
          {children}
        </main>
      </div>

      <PortalMobileNav />
    </div>
  );
}
