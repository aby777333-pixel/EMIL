'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-3"><Logo height={36} theme="dark" /></Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-[#7A8BA8] leading-relaxed">
          <p><strong className="text-white">1. Information We Collect</strong><br />We collect personal information you provide during registration, including name, email, phone number, date of birth, and address. We also collect KYC documents for identity verification.</p>
          <p><strong className="text-white">2. How We Use Your Data</strong><br />Your data is used to provide trading services, verify your identity, comply with regulatory requirements, prevent fraud, and improve our platform.</p>
          <p><strong className="text-white">3. Data Security</strong><br />We employ bank-grade encryption (AES-256), TLS 1.3, and secure data centers to protect your information. Access is restricted on a need-to-know basis.</p>
          <p><strong className="text-white">4. Data Sharing</strong><br />We do not sell your personal data. We may share data with regulatory authorities, payment processors, and liquidity providers as required for service delivery and legal compliance.</p>
          <p><strong className="text-white">5. Cookies</strong><br />We use essential cookies for platform functionality and analytics cookies to improve user experience. You can manage cookie preferences in your browser settings.</p>
          <p><strong className="text-white">6. Data Retention</strong><br />We retain your data for as long as your account is active and for a period thereafter as required by financial regulations (typically 5-7 years).</p>
          <p><strong className="text-white">7. Your Rights</strong><br />You have the right to access, correct, or delete your personal data. You may also request data portability or restrict processing under applicable data protection laws.</p>
          <p><strong className="text-white">8. Updates</strong><br />This policy may be updated periodically. We will notify you of material changes via email or platform notification.</p>
          <p><strong className="text-white">9. Contact</strong><br />For privacy-related inquiries, contact our Data Protection Officer at privacy@gio4x.com.</p>
        </div>
        <div className="mt-12"><Link href="/" className="text-[#00B4D8] text-sm hover:underline">Back to Home</Link></div>
      </div>
    </div>
  );
}
