'use client';

import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#060D16] text-[#EAF0FA]">
      <nav className="border-b border-white/[0.06] bg-[#060D16]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo height={36} theme="dark" />
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-[#7A8BA8] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg text-[#7A8BA8] mb-16 max-w-2xl">Get in touch with our team. We&apos;re here to help you launch and grow your trading business.</p>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Offices */}
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin size={20} className="text-[#00B4D8]" /> Head Office</h2>
              <div className="space-y-3 text-sm text-[#7A8BA8]">
                <p>Lorem ipsum dolor sit amet<br />Consectetur adipiscing elit<br />Sed do eiusmod tempor</p>
                <p className="flex items-center gap-2"><Phone size={14} className="text-[#00B4D8]" /> +1 111 111 1111</p>
                <p className="flex items-center gap-2"><Clock size={14} /> Mon-Fri: 9:00 AM - 6:00 PM</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin size={20} className="text-[#00B4D8]" /> Regional Office</h2>
              <div className="space-y-3 text-sm text-[#7A8BA8]">
                <p>Ut enim ad minim veniam<br />Quis nostrud exercitation<br />Ullamco laboris nisi</p>
                <p className="flex items-center gap-2"><Phone size={14} className="text-[#00B4D8]" /> +1 111 111 1111</p>
                <p className="flex items-center gap-2"><Clock size={14} /> Mon-Fri: 9:00 AM - 5:00 PM</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#00B4D8]">
              <Mail size={16} /> support@gio4xraptor.com
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0B1422]/60 p-8">
            <h2 className="text-lg font-bold mb-6">Send us a message</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent! We will contact you soon.'); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A8BA8] mb-1 block">First Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-lg text-sm bg-[#060D16] border border-white/[0.06] outline-none focus:border-[#00B4D8] transition-colors" placeholder="John" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A8BA8] mb-1 block">Last Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-lg text-sm bg-[#060D16] border border-white/[0.06] outline-none focus:border-[#00B4D8] transition-colors" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A8BA8] mb-1 block">Email</label>
                <input type="email" required className="w-full px-4 py-3 rounded-lg text-sm bg-[#060D16] border border-white/[0.06] outline-none focus:border-[#00B4D8] transition-colors" placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A8BA8] mb-1 block">Phone</label>
                <input type="tel" className="w-full px-4 py-3 rounded-lg text-sm bg-[#060D16] border border-white/[0.06] outline-none focus:border-[#00B4D8] transition-colors" placeholder="+1 234 567 8901" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7A8BA8] mb-1 block">Message</label>
                <textarea rows={4} required className="w-full px-4 py-3 rounded-lg text-sm bg-[#060D16] border border-white/[0.06] outline-none focus:border-[#00B4D8] transition-colors resize-none" placeholder="How can we help you?" />
              </div>
              <button type="submit" className="w-full py-3 rounded-lg bg-[#00B4D8] text-sm font-bold text-black transition-all hover:bg-[#007AB8]">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
