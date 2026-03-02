import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, ArrowRight } from 'lucide-react';
import { playSound } from '../utils/audio';

interface NamePromptProps {
  onComplete: (name: string) => void;
  lang: 'en' | 'pt';
}

export function NamePrompt({ onComplete, lang }: NamePromptProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      playSound('click');
      onComplete(name.trim());
    } else {
      playSound('error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#1a1a1a] rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
        
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <User size={40} className="text-purple-400" />
          </div>
        </div>

        <h2 className="text-2xl font-black tracking-widest uppercase text-center text-white mb-2">
          {lang === 'pt' ? 'Como devemos te chamar?' : 'What should we call you?'}
        </h2>
        <p className="text-center text-white/50 text-sm mb-8 font-medium">
          {lang === 'pt' ? 'Digite seu nome para aparecer no placar global.' : 'Enter your name to appear on the global leaderboard.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'pt' ? 'Seu nome épico' : 'Your epic name'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold tracking-wider text-center"
              maxLength={15}
              autoFocus
            />
          </div>

          <button
            type="submit"
            onMouseEnter={() => playSound('hover')}
            disabled={!name.trim()}
            className="w-full bg-white text-black font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lang === 'pt' ? 'Começar' : 'Start'}
            <ArrowRight size={20} />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
