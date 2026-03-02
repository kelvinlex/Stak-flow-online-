import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Headphones } from 'lucide-react';

interface IntroCutsceneProps {
  onComplete: () => void;
}

export function IntroCutscene({ onComplete }: IntroCutsceneProps) {
  const [phase, setPhase] = useState<'logo' | 'headphones' | 'done'>('logo');

  useEffect(() => {
    const logoTimer = setTimeout(() => {
      setPhase('headphones');
    }, 3500);

    const headphonesTimer = setTimeout(() => {
      setPhase('done');
      setTimeout(onComplete, 1000); // Wait for fade out
    }, 7500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(headphonesTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'done' ? 0 : 1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <AnimatePresence mode="wait">
        {phase === 'logo' && (
          <motion.div
            key="logo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <Layers className="w-12 h-12 text-white mb-4" strokeWidth={1} />
            <h1 className="text-xl font-light text-white tracking-[0.3em] uppercase">
              Stack <span className="text-white/50">2.0</span>
            </h1>
          </motion.div>
        )}

        {phase === 'headphones' && (
          <motion.div
            key="headphones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <Headphones className="w-10 h-10 text-white/80 mb-6" strokeWidth={1} />
            <p className="text-sm font-light text-white/60 tracking-widest uppercase text-center max-w-[200px] leading-relaxed">
              Use headphones for the best experience
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
