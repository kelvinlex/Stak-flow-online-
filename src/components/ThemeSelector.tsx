import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES, Theme } from '../game/Themes';
import { ArrowLeft, Lock, Square, Check, Zap, Sparkles, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound as playGlobalSound } from '../utils/audio';

interface ThemeSelectorProps {
  onBack: () => void;
  onSelect: (id: string) => void;
  currentThemeId: string;
  lang: 'en' | 'pt';
  unlockedThemes: string[];
  squares: number;
  rouletteCost: number;
  onSpinStart: () => string | null;
  onSpinEnd: (id: string) => void;
  freeRoulette: boolean;
  onToggleFreeRoulette: () => void;
  onBuyTheme?: (id: string) => void;
}

const IsometricBlock = ({ theme, className = "" }: { theme: Theme, className?: string }) => {
  const baseColor = theme.previewColor;
  return (
    <div className={`w-full h-full ${className} drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]`}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <polygon points="100,20 180,60 100,100 20,60" fill={baseColor} />
        <polygon points="20,60 100,100 100,180 20,140" fill={baseColor} style={{ filter: 'brightness(0.8)' }} />
        <polygon points="100,100 180,60 180,140 100,180" fill={baseColor} style={{ filter: 'brightness(0.6)' }} />
      </svg>
    </div>
  );
};

export function ThemeSelector({ onBack, onSelect, currentThemeId, lang, unlockedThemes, squares, rouletteCost, onSpinStart, onSpinEnd, freeRoulette, onToggleFreeRoulette }: ThemeSelectorProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState<'idle' | 'spinning' | 'found'>('idle');
  const [foundTheme, setFoundTheme] = useState<Theme | null>(null);
  const [rouletteItems, setRouletteItems] = useState<Theme[]>([]);
  const [spinOffset, setSpinOffset] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const playSound = (type: 'tick' | 'win') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'tick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
  };

  const startRoulette = () => {
    if (!freeRoulette && squares < rouletteCost) return;
    
    const wonId = onSpinStart();
    if (!wonId) {
      alert(lang === 'pt' ? 'Você já tem todos os temas!' : 'You already have all themes!');
      return;
    }

    const wonTheme = THEMES.find(t => t.id === wonId)!;
    
    // Generate a sequence of themes for the roulette
    const items: Theme[] = [];
    for (let i = 0; i < 40; i++) {
      items.push(THEMES[Math.floor(Math.random() * THEMES.length)]);
    }
    // Place the winning theme near the end
    items[35] = wonTheme;
    
    setRouletteItems(items);
    setIsSpinning(true);
    setSpinPhase('spinning');
    
    // Animate the spin
    const itemWidth = 160 + 32; // w-40 (160px) + gap-8 (32px)
    const targetOffset = -(35 * itemWidth) + (window.innerWidth / 2) - (160 / 2);
    
    let currentOffset = 0;
    let velocity = -60; // Start faster
    let lastTick = 0;
    
    const animateSpin = () => {
      currentOffset += velocity;
      
      // Smooth easing (friction)
      const distanceLeft = targetOffset - currentOffset;
      if (distanceLeft < 0) {
        velocity *= 0.97; // Slow down as it gets closer
      }
      
      if (Math.abs(currentOffset) > Math.abs(targetOffset) || Math.abs(velocity) < 0.5) {
        currentOffset = targetOffset;
        setSpinOffset(currentOffset);
        
        // Wait a tiny bit before showing the "found" screen for suspense
        setTimeout(() => {
          setSpinPhase('found');
          setFoundTheme(wonTheme);
          playSound('win');
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.5 },
            colors: [wonTheme.previewColor, '#ffffff', '#ffd700']
          });
        }, 500);
        return;
      }
      
      setSpinOffset(currentOffset);
      
      // Play tick sound when passing an item
      const passedItems = Math.floor(Math.abs(currentOffset) / itemWidth);
      if (passedItems > lastTick) {
        playSound('tick');
        lastTick = passedItems;
      }
      
      requestAnimationFrame(animateSpin);
    };
    
    requestAnimationFrame(animateSpin);
  };

  const rarityColors = {
    common: 'text-white/50 border-white/10',
    epic: 'text-purple-400 border-purple-500/50',
    legendary: 'text-yellow-400 border-yellow-500/50'
  };

  const rarityGlow = {
    common: '',
    epic: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    legendary: 'shadow-[0_0_40px_rgba(234,179,8,0.4)]'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col"
    >
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-10 border-b border-white/5">
        <button onClick={() => { playGlobalSound('click'); onBack(); }} onMouseEnter={() => playGlobalSound('hover')} className="text-white/70 hover:text-white hover:scale-110 transition-all p-2 bg-white/5 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-[0.2em] uppercase">
            {lang === 'pt' ? 'Temas' : 'Themes'}
          </h1>
          <div className="text-[10px] text-white/40 tracking-widest uppercase mt-1">
            {unlockedThemes.length} / {THEMES.length} {lang === 'pt' ? 'Desbloqueados' : 'Unlocked'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { playGlobalSound('click'); onToggleFreeRoulette(); }}
            onMouseEnter={() => playGlobalSound('hover')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-colors ${
              freeRoulette 
                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
            }`}
          >
            {lang === 'pt' ? 'Teste Grátis' : 'Free Test'}
          </button>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
            <span className="font-mono font-bold">{squares}</span>
            <Square size={14} fill="currentColor" className="text-white/70" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-7xl mx-auto pb-32">
          {THEMES.map((theme, index) => {
            const isUnlocked = freeRoulette || unlockedThemes.includes(theme.id);
            const isSelected = currentThemeId === theme.id;
            
            return (
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => playGlobalSound('hover')}
                onClick={() => {
                  if (isUnlocked) {
                    playGlobalSound('click');
                    onSelect(theme.id);
                  } else {
                    playGlobalSound('error');
                  }
                }}
                className={`relative aspect-square rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border-2 ${isSelected ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] ring-2 ring-white/50 ring-offset-2 ring-offset-[#0a0a0a]' : rarityColors[theme.rarity].split(' ')[1]} ${!isUnlocked ? 'opacity-50 grayscale-[0.8]' : ''} ${isUnlocked && !isSelected ? rarityGlow[theme.rarity] : ''}`}
                style={{ background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <IsometricBlock theme={theme} />
                </div>
                
                {/* Labels */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center">
                  <span className="font-bold tracking-widest uppercase text-xs text-center drop-shadow-md">
                    {theme.name[lang]}
                  </span>
                  <span className={`text-[8px] tracking-[0.2em] uppercase mt-1 font-bold ${rarityColors[theme.rarity].split(' ')[0]}`}>
                    {theme.rarity}
                  </span>
                </div>

                {/* Lock Overlay */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <Lock size={24} className="text-white/80 mb-3" />
                    <div className="flex items-center gap-1.5 bg-black/80 px-4 py-2 rounded-full border border-white/20">
                      <span className="text-white text-sm font-bold">{theme.price}</span>
                      <Square size={12} className="text-white" fill="currentColor" />
                    </div>
                  </div>
                )}

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-white text-black rounded-full p-1.5 shadow-lg z-30">
                    <Check size={14} strokeWidth={4} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Roulette Button */}
      {!isSpinning && unlockedThemes.length < THEMES.length && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => playGlobalSound('hover')}
            onClick={() => {
              if (!freeRoulette && squares < rouletteCost) {
                playGlobalSound('error');
              } else {
                playGlobalSound('click');
                startRoulette();
              }
            }}
            disabled={(!freeRoulette && squares < rouletteCost)}
            className="group relative px-8 py-4 bg-white text-black rounded-full flex items-center gap-4 hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <Sparkles size={20} className="text-black fill-black" />
            <span className="font-black tracking-[0.2em] uppercase text-sm">
              {lang === 'pt' ? 'GIRAR ROLETA' : 'SPIN ROULETTE'}
            </span>
            <div className="h-4 w-px bg-black/20" />
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold">{freeRoulette ? 0 : rouletteCost}</span>
              <Square size={12} fill="currentColor" className="text-black/70" />
            </div>
          </motion.button>
        </div>
      )}

      {/* Roulette Overlay */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-xl"
          >
            {spinPhase === 'spinning' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.1, opacity: 0 }}
                className="w-full h-64 relative overflow-hidden flex items-center"
              >
                {/* Center Marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-50 -translate-x-1/2 shadow-[0_0_20px_rgba(255,255,255,1)]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-white rounded-3xl z-40 pointer-events-none shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
                
                <div 
                  className="flex gap-8 absolute left-0"
                  style={{ transform: `translateX(${spinOffset}px)` }}
                >
                  {rouletteItems.map((item, i) => {
                    // Calculate distance from center for dynamic scaling
                    const itemCenter = Math.abs(spinOffset) + (i * 192) + 80;
                    const screenCenter = window.innerWidth / 2;
                    const distanceFromCenter = Math.abs(itemCenter - screenCenter);
                    const scale = Math.max(0.8, 1 - (distanceFromCenter / 1000));
                    const opacity = Math.max(0.3, 1 - (distanceFromCenter / 800));

                    return (
                      <div 
                        key={i} 
                        className="w-40 h-40 shrink-0 flex items-center justify-center rounded-3xl border-2 border-white/10 relative overflow-hidden transition-all duration-75" 
                        style={{ 
                          background: `linear-gradient(135deg, ${item.bg[0]}, ${item.bg[1]})`,
                          transform: `scale(${scale})`,
                          opacity: opacity
                        }}
                      >
                        <div className="w-24 h-24">
                          <IsometricBlock theme={item} />
                        </div>
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {spinPhase === 'found' && foundTheme && (
              <motion.div 
                initial={{ scale: 0.2, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
                className="flex flex-col items-center pointer-events-auto bg-[#0a0a0a]/80 p-12 rounded-[3rem] border border-white/10 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/50 text-sm tracking-[0.5em] uppercase mb-6 font-bold"
                >
                  {lang === 'pt' ? 'TEMA DESBLOQUEADO' : 'THEME UNLOCKED'}
                </motion.div>
                
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.1, 1] }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className={`w-64 h-64 rounded-[2rem] flex items-center justify-center mb-8 border-4 shadow-[0_0_80px_rgba(255,255,255,0.2)] relative ${rarityColors[foundTheme.rarity].split(' ')[1]}`}
                  style={{ background: `linear-gradient(135deg, ${foundTheme.bg[0]}, ${foundTheme.bg[1]})` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-[2rem]" />
                  <div className="w-40 h-40 relative z-10">
                    <IsometricBlock theme={foundTheme} />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-white text-4xl font-black tracking-[0.2em] uppercase mb-2 text-center drop-shadow-lg"
                >
                  {foundTheme.name[lang]}
                </motion.div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className={`text-sm tracking-[0.3em] uppercase mb-12 font-bold ${rarityColors[foundTheme.rarity].split(' ')[0]}`}
                >
                  {foundTheme.rarity}
                </motion.div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex gap-4 w-full"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => playGlobalSound('hover')}
                    onClick={() => {
                      playGlobalSound('click');
                      onSpinEnd(foundTheme.id);
                      setIsSpinning(false);
                      setSpinPhase('idle');
                      onSelect(foundTheme.id);
                    }}
                    className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold tracking-[0.2em] uppercase transition-all hover:bg-white/20 border border-white/20 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    {lang === 'pt' ? 'VOLTAR' : 'BACK'}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onHoverStart={() => playGlobalSound('hover')}
                    onClick={() => {
                      playGlobalSound('click');
                      onSpinEnd(foundTheme.id);
                      setIsSpinning(false);
                      setSpinPhase('idle');
                      onSelect(foundTheme.id);
                      onBack(); // Go back to main menu
                    }}
                    className="flex-1 py-4 bg-white text-black rounded-2xl font-black tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] flex items-center justify-center gap-2"
                  >
                    <Play size={18} fill="currentColor" />
                    {lang === 'pt' ? 'JOGAR' : 'PLAY'}
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
