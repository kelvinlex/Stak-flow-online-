import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Square, Star, Heart, Award, PlaySquare, Loader2 } from 'lucide-react';
import { playSound } from '../utils/audio';

interface Mission {
  id: string;
  title: string;
  progress: number;
  target: number;
  reward: number;
  rewardType: 'squares' | 'xp';
  completed: boolean;
}

interface MissionsProps {
  onBack: () => void;
  lang: 'en' | 'pt';
  missions: Mission[];
  xp: number;
  squares: number;
  onClaimReward: (id: string) => void;
  onWatchAd: () => void;
}

export function Missions({ onBack, lang, missions, xp, squares, onClaimReward, onWatchAd }: MissionsProps) {
  const getLevel = (xp: number) => Math.floor(xp / 1000) + 1;
  const getProgressToNextLevel = (xp: number) => (xp % 1000) / 1000;
  
  const [timeLeft, setTimeLeft] = useState('');
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAd = () => {
    playSound('click');
    setIsWatchingAd(true);
    setTimeout(() => {
      playSound('reward');
      setIsWatchingAd(false);
      onWatchAd();
    }, 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col font-sans bg-[#0a0a0a] text-white overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden fixed z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-yellow-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
      </div>

      {/* Header */}
      <div className="p-8 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-20 border-b border-white/5">
        <button 
          onClick={() => { playSound('click'); onBack(); }}
          onMouseEnter={() => playSound('hover')}
          className="text-white/70 hover:text-white hover:scale-110 transition-all bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/10"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            {lang === 'pt' ? 'Missões' : 'Missions'}
          </h1>
          <span className="text-yellow-400/80 text-xs font-mono mt-1 tracking-[0.2em] uppercase font-bold">
            {timeLeft}
          </span>
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar relative z-10 pb-24">
        <div className="max-w-2xl mx-auto w-full px-6 pt-8 flex flex-col gap-8">
          
          {/* Level Progress */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex justify-between items-end mb-6 relative z-10">
              <div className="flex flex-col">
                <span className="text-white/50 text-xs tracking-[0.2em] uppercase mb-2 font-bold">
                  {lang === 'pt' ? 'Nível Atual' : 'Current Level'}
                </span>
                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  {getLevel(xp)}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
                <Award size={20} className="text-purple-400" />
                <span className="text-white font-black tracking-widest text-lg">{xp} XP</span>
              </div>
            </div>
            
            <div className="h-3 bg-black/60 rounded-full overflow-hidden relative border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${getProgressToNextLevel(xp) * 100}%` }}
                transition={{ duration: 1.5, type: 'spring', bounce: 0.4 }}
                className="h-full absolute top-0 left-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              />
            </div>
            <div className="mt-4 flex justify-between items-center relative z-10">
              <span className="text-yellow-400 text-xs tracking-[0.2em] uppercase flex items-center gap-2 font-bold bg-yellow-400/10 px-3 py-1.5 rounded-lg">
                <Square size={12} fill="currentColor" />
                {lang === 'pt' ? 'Nível +1 = +50' : 'Level Up = +50'}
              </span>
              <span className="text-white/40 text-xs tracking-widest font-mono font-bold">
                {Math.floor(getProgressToNextLevel(xp) * 1000)} / 1000 XP
              </span>
            </div>
          </motion.div>

          {/* Missions List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3 text-white/70 ml-2 mb-6">
              <Star size={20} className="text-yellow-400" />
              {lang === 'pt' ? 'Missões Diárias' : 'Daily Missions'}
            </h2>
            
            {missions.filter(m => !m.completed).length === 0 ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-black/40 backdrop-blur-xl rounded-3xl p-12 border border-white/10 border-dashed text-center flex flex-col items-center gap-6"
              >
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Check size={48} className="text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-white font-black tracking-[0.2em] uppercase text-xl mb-2">
                    {lang === 'pt' ? 'Tudo concluído!' : 'All done!'}
                  </h3>
                  <p className="text-white/50 text-sm tracking-widest font-bold">
                    {lang === 'pt' ? 'Volte amanhã para mais missões.' : 'Come back tomorrow for more missions.'}
                  </p>
                </div>
              </motion.div>
            ) : (
              missions.filter(m => !m.completed).map((mission, index) => {
                const isCompleted = mission.progress >= mission.target;
                
                return (
                  <motion.div
                    key={mission.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className={`relative overflow-hidden rounded-3xl p-6 border transition-all duration-500 ${
                      isCompleted && !mission.completed
                        ? 'border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)]' 
                        : 'border-white/10 bg-black/40 backdrop-blur-xl hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {isCompleted && !mission.completed && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-transparent opacity-50 pointer-events-none" />
                    )}
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <h3 className="text-white font-bold tracking-wider text-lg flex-1 mr-4">
                        {mission.title}
                      </h3>
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                        <span className="text-white font-black tracking-widest">+{mission.reward}</span>
                        {mission.rewardType === 'squares' && <Square size={16} className="text-yellow-400" fill="currentColor" />}
                        {mission.rewardType === 'xp' && <Award size={16} className="text-purple-400" />}
                      </div>
                    </div>

                    <div className="relative h-2 bg-black/60 rounded-full overflow-hidden mb-4 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((mission.progress / mission.target) * 100, 100)}%` }}
                        transition={{ duration: 1.5, type: 'spring', bounce: 0.2 }}
                        className={`h-full absolute top-0 left-0 ${isCompleted ? 'bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-gradient-to-r from-white/50 to-white/80'}`}
                      />
                    </div>

                    <div className="flex justify-between items-center h-12 relative z-10">
                      <span className="text-white/50 text-xs tracking-widest font-mono font-bold">
                        {mission.progress} / {mission.target}
                      </span>
                      
                      {isCompleted && !mission.completed ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onHoverStart={() => playSound('hover')}
                          onClick={() => { playSound('reward'); onClaimReward(mission.id); }}
                          className="bg-yellow-500 text-black px-6 py-3 rounded-xl text-xs font-black tracking-[0.2em] uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:bg-yellow-400 transition-colors"
                        >
                          <Check size={16} strokeWidth={3} />
                          {lang === 'pt' ? 'Resgatar' : 'Claim'}
                        </motion.button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Ad Section */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <h3 className="text-white font-black tracking-[0.2em] mb-3 uppercase text-lg relative z-10">
                {lang === 'pt' ? 'Precisa de mais moedas?' : 'Need more coins?'}
              </h3>
              <p className="text-white/60 text-sm mb-8 tracking-widest font-bold relative z-10">
                {lang === 'pt' ? 'Assista a um anúncio para ganhar 10 moedas extras!' : 'Watch an ad to earn 10 extra coins!'}
              </p>
              <button
                onClick={handleWatchAd}
                onMouseEnter={() => playSound('hover')}
                disabled={isWatchingAd}
                className="w-full py-5 bg-white text-black hover:bg-white/90 rounded-2xl font-black tracking-[0.2em] uppercase text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] relative z-10"
              >
                {isWatchingAd ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {lang === 'pt' ? 'Assistindo...' : 'Watching...'}
                  </>
                ) : (
                  <>
                    <PlaySquare size={20} />
                    {lang === 'pt' ? 'Assistir Anúncio (+10)' : 'Watch Ad (+10)'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
