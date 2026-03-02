import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { THEMES } from '../game/Themes';
import { Grid, User, Users, Download, Share2, RotateCcw, Home, Check, Square, Star, Heart, Award, Trophy, Music, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { playSound } from '../utils/audio';

interface UIProps {
  gameState: string;
  score: number;
  perfectCombo: number;
  highScore: number;
  onStart: () => void;
  onRestart: () => void;
  themeId: string;
  setThemeId: (id: string) => void;
  lang: 'en' | 'pt';
  setLang: (lang: 'en' | 'pt') => void;
  onOpenThemes: () => void;
  onOpenProfile: () => void;
  onOpenMultiplayer: () => void;
  onOpenMissions: () => void;
  onOpenLeaderboard: () => void;
  lastScreenshot?: string | null;
  onSavePhoto?: () => void;
  onMainMenu?: () => void;
  squares: number;
  unlockedThemes: string[];
  freeRoulette: boolean;
  onToggleFreeRoulette: () => void;
  hasCompletedMissions?: boolean;
  onToggleCamera?: () => void;
  is2D?: boolean;
  isMultiplayer?: boolean;
  opponentScore?: number;
  onRematch?: () => void;
}

export function UI({ gameState, score, perfectCombo, highScore, onStart, onRestart, themeId, setThemeId, lang, setLang, onOpenThemes, onOpenProfile, onOpenMultiplayer, onOpenMissions, onOpenLeaderboard, lastScreenshot, onSavePhoto, onMainMenu, squares, unlockedThemes, freeRoulette, onToggleFreeRoulette, hasCompletedMissions, onToggleCamera, is2D, isMultiplayer, opponentScore, onRematch }: UIProps) {
  const [photoSaved, setPhotoSaved] = useState(false);

  useEffect(() => {
    if (gameState === 'playing') {
      setPhotoSaved(false);
    }
  }, [gameState]);

  const t = {
    newRecord: lang === 'pt' ? 'NOVO RECORDE' : 'NEW RECORD',
    best: lang === 'pt' ? 'RECORDE' : 'BEST',
    tapStart: lang === 'pt' ? 'TOQUE PARA COMEÇAR' : 'TAP TO START',
    tapRestart: lang === 'pt' ? 'RECOMEÇAR' : 'RESTART',
    menu: lang === 'pt' ? 'MENU PRINCIPAL' : 'MAIN MENU',
  };

  const handlePrevTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = THEMES.findIndex(t => t.id === themeId);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = THEMES.length - 1;
    
    // Find previous unlocked theme
    while (!unlockedThemes.includes(THEMES[prevIndex].id) && !freeRoulette) {
      prevIndex--;
      if (prevIndex < 0) prevIndex = THEMES.length - 1;
    }
    setThemeId(THEMES[prevIndex].id);
  };

  const handleNextTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = THEMES.findIndex(t => t.id === themeId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= THEMES.length) nextIndex = 0;
    
    // Find next unlocked theme
    while (!unlockedThemes.includes(THEMES[nextIndex].id) && !freeRoulette) {
      nextIndex++;
      if (nextIndex >= THEMES.length) nextIndex = 0;
    }
    setThemeId(THEMES[nextIndex].id);
  };

  if (gameState === 'intro') return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-24">
      <div className="absolute top-8 left-8 pointer-events-auto flex flex-col items-start gap-4">
        {gameState === 'playing' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => playSound('hover')}
                className="cursor-pointer text-white/50 hover:text-white transition-colors flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md" 
                onClick={() => { playSound('click'); onRestart(); }}
              >
                <RotateCcw size={20} />
                <span className="text-xs font-bold tracking-widest uppercase">{t.tapRestart}</span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => playSound('hover')}
                className="cursor-pointer text-white/50 hover:text-white transition-colors flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md" 
                onClick={() => { playSound('click'); onMainMenu?.(); }}
              >
                <Home size={20} />
                <span className="text-xs font-bold tracking-widest uppercase">{t.menu}</span>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-8 right-8 pointer-events-auto flex flex-col items-end gap-4">
        <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-widest">
            <Square size={16} fill="currentColor" />
            {squares}
          </div>
        </div>
        <div className="cursor-pointer text-white/50 hover:text-white transition-colors font-bold tracking-widest text-center" onClick={() => { playSound('click'); setLang(lang === 'en' ? 'pt' : 'en'); }}>
          {lang === 'en' ? 'EN' : 'PT'}
        </div>
        <div 
          className="cursor-pointer text-white/50 hover:text-white transition-colors font-bold tracking-widest text-center text-[10px] bg-black/40 px-2 py-1 rounded" 
          onClick={() => { playSound('click'); onToggleFreeRoulette(); }}
        >
          {freeRoulette ? 'TEST: FREE' : 'TEST: PAID'}
        </div>
      </div>

      {(['start', 'theme_selection', 'profile', 'multiplayer', 'missions', 'leaderboard'].includes(gameState)) && (
        <div className="absolute bottom-8 left-0 right-0 pointer-events-auto flex justify-center gap-4 px-4 z-20 flex-wrap">
          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onHoverStart={() => playSound('hover')}
            className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${gameState === 'theme_selection' ? 'text-white' : 'text-white/70 hover:text-white'}`} 
            onClick={() => { playSound('click'); onOpenThemes(); }}
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ${gameState === 'theme_selection' ? 'bg-white/20 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}>
              <motion.div animate={gameState === 'theme_selection' ? { rotate: 90 } : { rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                <Grid size={28} strokeWidth={gameState === 'theme_selection' ? 2.5 : 2} />
              </motion.div>
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{lang === 'pt' ? 'Temas' : 'Themes'}</span>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onHoverStart={() => playSound('hover')}
            className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${gameState === 'multiplayer' ? 'text-white' : 'text-white/70 hover:text-white'}`} 
            onClick={() => { playSound('click'); onOpenMultiplayer(); }}
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ${gameState === 'multiplayer' ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}>
              <motion.div animate={gameState === 'multiplayer' ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
                <Users size={28} strokeWidth={gameState === 'multiplayer' ? 2.5 : 2} className={gameState === 'multiplayer' ? 'text-blue-400' : ''} />
              </motion.div>
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{lang === 'pt' ? 'Online' : 'Online'}</span>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onHoverStart={() => playSound('hover')}
            className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${gameState === 'profile' ? 'text-white' : 'text-white/70 hover:text-white'}`} 
            onClick={() => { playSound('click'); onOpenProfile(); }}
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ${gameState === 'profile' ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}>
              <motion.div animate={gameState === 'profile' ? { y: [-2, 2, -2] } : {}} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <User size={28} strokeWidth={gameState === 'profile' ? 2.5 : 2} className={gameState === 'profile' ? 'text-purple-400' : ''} />
              </motion.div>
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{lang === 'pt' ? 'Perfil' : 'Profile'}</span>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onHoverStart={() => playSound('hover')}
            className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 relative ${gameState === 'missions' ? 'text-white' : 'text-white/70 hover:text-white'}`} 
            onClick={() => { playSound('click'); onOpenMissions(); }}
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border-2 relative transition-all duration-300 ${gameState === 'missions' ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}>
              <motion.div animate={gameState === 'missions' ? { rotate: [0, -10, 10, -10, 10, 0] } : {}} transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}>
                <Award size={28} strokeWidth={gameState === 'missions' ? 2.5 : 2} className={gameState === 'missions' ? 'text-red-400' : ''} />
              </motion.div>
              {hasCompletedMissions && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
              )}
              {hasCompletedMissions && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
              )}
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{lang === 'pt' ? 'Missões' : 'Missions'}</span>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onHoverStart={() => playSound('hover')}
            className={`cursor-pointer transition-all duration-300 flex flex-col items-center gap-2 ${gameState === 'leaderboard' ? 'text-white' : 'text-white/70 hover:text-white'}`} 
            onClick={() => { playSound('click'); onOpenLeaderboard(); }}
          >
            <div className={`p-4 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ${gameState === 'leaderboard' ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}>
              <motion.div animate={gameState === 'leaderboard' ? { y: [0, -5, 0] } : {}} transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}>
                <Trophy size={28} strokeWidth={gameState === 'leaderboard' ? 2.5 : 2} className={gameState === 'leaderboard' ? 'text-yellow-400' : ''} />
              </motion.div>
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{lang === 'pt' ? 'Ranks' : 'Ranks'}</span>
          </motion.div>
        </div>
      )}

      <div className="pointer-events-none z-10">
        <AnimatePresence>
          {gameState === 'playing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 50 }}
              className="fixed top-1/2 right-8 md:right-16 -translate-y-1/2 flex flex-col items-end"
            >
              <div className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-3 mb-2 shadow-xl">
                <div className="flex flex-col items-end">
                  <span className="text-white/50 text-[8px] font-bold tracking-[0.3em] uppercase">{t.best}</span>
                  <span className="text-white/90 text-sm font-black tracking-widest">{highScore}</span>
                </div>
              </div>
              
              <motion.div
                key={score}
                initial={{ scale: 1.5, y: -20, textShadow: score > highScore && score > 0 ? '0 0 60px rgba(250,204,21,1)' : '0 0 40px rgba(255,255,255,0.8)' }}
                animate={{ scale: 1, y: 0, textShadow: score > highScore && score > 0 ? '0 0 30px rgba(250,204,21,0.6)' : '0 0 20px rgba(255,255,255,0.0)' }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`text-[80px] md:text-[100px] leading-none font-black tracking-tighter drop-shadow-2xl transition-colors duration-500 ${score > highScore && score > 0 ? 'text-yellow-400' : 'text-white'}`}
              >
                {score}
              </motion.div>
              
              <AnimatePresence>
                {perfectCombo > 1 && (
                  <motion.div
                    key={`combo-${perfectCombo}`}
                    initial={{ scale: 0.5, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="mt-2 text-white font-black italic tracking-widest text-xl md:text-2xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] whitespace-nowrap"
                  >
                    PERFECT x{perfectCombo}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {gameState === 'start' && (
          <>
            {/* Side Arrows for Theme Switching */}
            {(unlockedThemes.length > 1 || freeRoulette) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none z-10"
              >
                <motion.button 
                  whileHover={{ scale: 1.2, x: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onHoverStart={() => playSound('hover')}
                  onClick={(e) => { playSound('click'); handlePrevTheme(e); }}
                  className="text-white/50 hover:text-white transition-colors p-4 pointer-events-auto"
                >
                  <ChevronLeft size={48} strokeWidth={1} />
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.2, x: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onHoverStart={() => playSound('hover')}
                  onClick={(e) => { playSound('click'); handleNextTheme(e); }}
                  className="text-white/50 hover:text-white transition-colors p-4 pointer-events-auto"
                >
                  <ChevronRight size={48} strokeWidth={1} />
                </motion.button>
              </motion.div>
            )}

            {/* Start Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none z-10"
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => playSound('hover')}
                className="text-white text-lg md:text-xl font-light tracking-[0.3em] pointer-events-auto cursor-pointer drop-shadow-lg text-center uppercase"
                onClick={() => { playSound('click'); onStart(); }}
              >
                {t.tapStart}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-8"
          >
            {/* Top Section: Score */}
            {isMultiplayer ? (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center mt-12 w-full max-w-2xl mx-auto"
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="text-white text-5xl font-black mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] uppercase tracking-[0.3em] text-center"
                >
                  {score > (opponentScore || 0) ? (lang === 'pt' ? 'VITÓRIA' : 'VICTORY') : 
                   score < (opponentScore || 0) ? (lang === 'pt' ? 'DERROTA' : 'DEFEAT') : 
                   (lang === 'pt' ? 'EMPATE' : 'DRAW')}
                </motion.div>
                
                <div className="flex w-full items-center justify-between gap-4 relative">
                  {/* VS Badge */}
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] border-4 border-[#0a0a0a]"
                  >
                    <span className="text-white font-black italic text-xl drop-shadow-md">VS</span>
                  </motion.div>

                  {/* Player Score Card */}
                  <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={`flex-1 flex flex-col items-center p-8 rounded-3xl relative overflow-hidden ${score >= (opponentScore || 0) ? 'bg-gradient-to-br from-purple-600/40 to-purple-900/40 border-2 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)]' : 'bg-black/40 border border-white/10'}`}
                  >
                    {score > (opponentScore || 0) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent animate-pulse" />
                    )}
                    <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mb-6 relative z-10">
                      <span className="text-white/70 text-sm font-bold tracking-[0.3em] uppercase">{lang === 'pt' ? 'VOCÊ' : 'YOU'}</span>
                    </div>
                    <motion.div 
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: "spring", stiffness: 300 }}
                      className={`text-7xl md:text-8xl font-black tracking-tighter relative z-10 ${score >= (opponentScore || 0) ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : 'text-white/50'}`}
                    >
                      {score}
                    </motion.div>
                  </motion.div>

                  {/* Opponent Score Card */}
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className={`flex-1 flex flex-col items-center p-8 rounded-3xl relative overflow-hidden ${(opponentScore || 0) >= score ? 'bg-gradient-to-br from-blue-600/40 to-blue-900/40 border-2 border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-black/40 border border-white/10'}`}
                  >
                    {(opponentScore || 0) > score && (
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent animate-pulse" />
                    )}
                    <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mb-6 relative z-10">
                      <span className="text-white/70 text-sm font-bold tracking-[0.3em] uppercase">{lang === 'pt' ? 'OPONENTE' : 'OPPONENT'}</span>
                    </div>
                    <motion.div 
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
                      className={`text-7xl md:text-8xl font-black tracking-tighter relative z-10 ${(opponentScore || 0) >= score ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : 'text-white/50'}`}
                    >
                      {opponentScore}
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center mt-12"
              >
                <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 mb-6 shadow-xl">
                  <span className="text-white/70 text-sm tracking-[0.3em] uppercase">{t.best}: {highScore}</span>
                </div>
                <div className="text-white text-[120px] leading-none font-black tracking-tighter drop-shadow-2xl mb-2">{score}</div>
                
                {score >= highScore && score > 0 && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-yellow-400 text-xl font-bold tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] uppercase bg-yellow-400/10 px-4 py-1 rounded-full border border-yellow-400/30 mt-2"
                  >
                    {t.newRecord}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Bottom Section: Buttons */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-6 mb-8 pointer-events-auto w-full max-w-md mx-auto"
            >
              {!isMultiplayer && lastScreenshot && (
                <div className="flex gap-4 w-full justify-center">
                  <button 
                    onClick={() => {
                      playSound('click');
                      if (onSavePhoto) onSavePhoto();
                      setPhotoSaved(true);
                    }}
                    disabled={photoSaved}
                    onMouseEnter={() => playSound('hover')}
                    className="flex-1 py-3 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center gap-2 text-white hover:bg-black/60 transition-colors disabled:opacity-50 border border-white/10"
                  >
                    {photoSaved ? <Check size={16} /> : <Download size={16} />}
                    <span className="text-xs tracking-widest uppercase">{photoSaved ? 'Salvo' : 'Salvar Foto'}</span>
                  </button>
                  <button 
                    onClick={async () => {
                      playSound('click');
                      try {
                        const blob = await (await fetch(lastScreenshot)).blob();
                        const file = new File([blob], `score-${score}.jpg`, { type: 'image/jpeg' });
                        if (navigator.share) {
                          await navigator.share({ title: 'Stack Score', files: [file] });
                        }
                      } catch (e) {}
                    }}
                    onMouseEnter={() => playSound('hover')}
                    className="flex-1 py-3 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center gap-2 text-white hover:bg-black/60 transition-colors border border-white/10"
                  >
                    <Share2 size={16} />
                    <span className="text-xs tracking-widest uppercase">Compartilhar</span>
                  </button>
                </div>
              )}

              <div className="flex gap-4 w-full justify-center">
                {isMultiplayer ? (
                  <button 
                    onClick={() => { playSound('click'); onRematch?.(); }}
                    onMouseEnter={() => playSound('hover')}
                    className="flex-1 py-4 rounded-2xl bg-white text-black font-bold tracking-widest text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    <RotateCcw size={18} />
                    {lang === 'pt' ? 'REVANCHE' : 'REMATCH'}
                  </button>
                ) : (
                  <button 
                    onClick={() => { playSound('click'); onRestart(); }}
                    onMouseEnter={() => playSound('hover')}
                    className="flex-1 py-4 rounded-2xl bg-white text-black font-bold tracking-widest text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    <RotateCcw size={18} />
                    {t.tapRestart}
                  </button>
                )}
                
                {!isMultiplayer && (
                  <button 
                    onClick={() => {
                      playSound('click');
                      // Placeholder for ad continue logic
                      console.log("Ad continue clicked");
                    }}
                    onMouseEnter={() => playSound('hover')}
                    className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-bold tracking-widest text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {lang === 'pt' ? 'CONTINUAR' : 'CONTINUE'}
                  </button>
                )}
              </div>
              
              <div className="flex gap-4 w-full justify-center">
                <button 
                  onClick={() => { playSound('click'); onMainMenu?.(); }}
                  onMouseEnter={() => playSound('hover')}
                  className="w-full py-4 rounded-2xl bg-black/40 text-white font-bold tracking-widest text-sm hover:bg-black/60 transition-colors flex items-center justify-center gap-2 border border-white/10 backdrop-blur-md"
                >
                  <Home size={18} />
                  {isMultiplayer ? (lang === 'pt' ? 'SAIR' : 'EXIT') : t.menu}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
