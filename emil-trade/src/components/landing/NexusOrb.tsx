'use client';

import { motion } from 'framer-motion';

export default function RaptorAIOrb() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Outer pulse rings */}
      <motion.div
        className="absolute inset-0 rounded-full border border-[#8b5cf6]/20"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-[#0091D5]/20"
        animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Orbiting dots */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-[#0091D5]"
        style={{ top: '50%', left: '50%', marginTop: -4, marginLeft: -4 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute -top-16 left-0 w-2 h-2 rounded-full bg-[#0091D5] shadow-[0_0_8px_rgba(0,145,213,0.6)]" />
      </motion.div>
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-[#009B4D]"
        style={{ top: '50%', left: '50%', marginTop: -4, marginLeft: -4 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute -top-20 left-0 w-2 h-2 rounded-full bg-[#009B4D] shadow-[0_0_8px_rgba(0,155,77,0.6)]" />
      </motion.div>
      {/* Core orb */}
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #8b5cf6, #0091D5 40%, #009B4D 80%, #060D16)',
          boxShadow: '0 0 60px rgba(139,92,246,0.3), 0 0 120px rgba(0,145,213,0.15), inset 0 0 40px rgba(0,0,0,0.5)',
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner glow */}
      <motion.div
        className="absolute inset-10 rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.15), transparent 60%)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* R label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white/90 tracking-wider" style={{ textShadow: '0 0 20px rgba(139,92,246,0.5)' }}>R</span>
      </div>
    </div>
  );
}
