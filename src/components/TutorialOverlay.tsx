import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { playSound } from '../utils/audio';

interface TutorialOverlayProps {
  onComplete: () => void;
  lang: 'en' | 'pt';
}

export function TutorialOverlay({ onComplete, lang }: TutorialOverlayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md font-sans"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-[85%] max-w-sm bg-[#1e1e2e] rounded-xl border border-white/20 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="pt-6 pb-2 px-6 text-center">
          <h2 className="text-3xl font-light text-white tracking-wide">
            Tutorial
          </h2>
        </div>
        <div className="px-6">
          <div className="w-full h-px bg-white/80" />
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center space-y-8">
          {/* Perfect placement */}
          <div className="flex flex-col items-center text-center space-y-4 w-full">
            <div className="flex items-center justify-center gap-6">
              {/* Isometric Block Stack */}
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                  <g stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round">
                    {/* Bottom block */}
                    <path d="M50 80 L20 65 L50 50 L80 65 Z" />
                    <path d="M20 65 L20 75 L50 90 L80 75 L80 65" />
                    <path d="M50 80 L50 90" />
                    
                    {/* Middle block */}
                    <path d="M50 65 L20 50 L50 35 L80 50 Z" />
                    <path d="M20 50 L20 60 L50 75 L80 60 L80 50" />
                    <path d="M50 65 L50 75" />
                    
                    {/* Top block */}
                    <path d="M50 50 L20 35 L50 20 L80 35 Z" />
                    <path d="M20 35 L20 45 L50 60 L80 45 L80 35" />
                    <path d="M50 50 L50 60" />
                  </g>
                </svg>
              </div>
              
              {/* Tap Indicator (Click Lines) */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.5],
                    opacity: [0.8, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-8 h-8 border-2 border-white rounded-full"
                />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                  className="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                />
                {/* Radiating lines */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <motion.div
                    key={angle}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5],
                      x: Math.cos(angle * Math.PI / 180) * 20,
                      y: Math.sin(angle * Math.PI / 180) * 20
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: "easeOut"
                    }}
                    className="absolute w-1.5 h-0.5 bg-white rounded-full"
                    style={{ transform: `rotate(${angle}deg)` }}
                  />
                ))}
              </div>
            </div>
            
            <p className="text-white font-light text-xl tracking-wide">
              {lang === 'pt' ? 'Toque para parar' : 'Tap to stop'}
            </p>
          </div>

          <div className="w-full h-px bg-white/80" />

          {/* Missed placement */}
          <div className="flex flex-col items-center text-center space-y-4 w-full">
            <div className="flex items-center justify-center gap-6">
              {/* Isometric Block Stack Misaligned */}
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                  <g stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round">
                    {/* Bottom block */}
                    <path d="M50 80 L20 65 L50 50 L80 65 Z" />
                    <path d="M20 65 L20 75 L50 90 L80 75 L80 65" />
                    <path d="M50 80 L50 90" />
                    
                    {/* Middle block */}
                    <path d="M50 65 L20 50 L50 35 L80 50 Z" />
                    <path d="M20 50 L20 60 L50 75 L80 60 L80 50" />
                    <path d="M50 65 L50 75" />
                    
                    {/* Top block (misaligned) */}
                    <g transform="translate(15, -10)">
                      <path d="M50 50 L20 35 L50 20 L80 35 Z" />
                      <path d="M20 35 L20 45 L50 60 L80 45 L80 35" />
                      <path d="M50 50 L50 60" />
                    </g>
                  </g>
                </svg>
              </div>
              
              {/* Tap Indicator (Click Lines) - Misaligned version */}
              <div className="relative w-12 h-12 flex items-center justify-center opacity-70">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.5],
                    opacity: [0.6, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    delay: 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-8 h-8 border border-white/50 rounded-full"
                />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    delay: 0.5,
                    ease: "easeInOut"
                  }}
                  className="w-4 h-4 bg-white/50 rounded-full"
                />
                {/* Radiating lines */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <motion.div
                    key={angle}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 0.7, 0],
                      scale: [0.5, 1.5],
                      x: Math.cos(angle * Math.PI / 180) * 20,
                      y: Math.sin(angle * Math.PI / 180) * 20
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      delay: 0.5,
                      ease: "easeOut"
                    }}
                    className="absolute w-1.5 h-0.5 bg-white/50 rounded-full"
                    style={{ transform: `rotate(${angle}deg)` }}
                  />
                ))}
              </div>
            </div>
            
            <p className="text-white font-light text-xl tracking-wide">
              {lang === 'pt' ? 'Atrasado / Cedo' : 'Late / Early'}
              <br />
              = {lang === 'pt' ? 'fim de jogo' : 'game over'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Close Button Outside */}
      <motion.button 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => { playSound('click'); onComplete(); }}
        onMouseEnter={() => playSound('hover')}
        className="mt-8 w-16 h-16 rounded-full border-2 border-white flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-lg"
      >
        <X size={40} strokeWidth={1.5} />
      </motion.button>
    </motion.div>
  );
}
