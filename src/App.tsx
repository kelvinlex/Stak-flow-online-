import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameCanvas } from './components/GameCanvas';
import { UI } from './components/UI';
import { ThemeSelector } from './components/ThemeSelector';
import { Profile, UserProfile } from './components/Profile';
import { Missions } from './components/Missions';
import { Leaderboard } from './components/Leaderboard';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { NamePrompt } from './components/NamePrompt';
import { io, Socket } from 'socket.io-client';
import { IntroCutscene } from './components/IntroCutscene';
import { TutorialOverlay } from './components/TutorialOverlay';
import { StackGame } from './game/StackGame';
import { THEMES } from './game/Themes';
import { Particles } from './components/Particles';
import { supabaseService } from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabase';

export default function App() {
  const [gameState, setGameState] = useState('intro');
  const [score, setScore] = useState(0);
  const [perfectCombo, setPerfectCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [lang, setLang] = useState<'en' | 'pt'>('pt');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: Math.random().toString(36).substring(2, 6).toUpperCase(),
    name: '',
    avatar: '',
    hoursPlayed: [0, 0, 0, 0, 0, 0, 0],
    savedPhotos: []
  });
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [squares, setSquares] = useState(0);
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>([THEMES[0].id]);
  const [rouletteCost, setRouletteCost] = useState(100);
  const [freeRoulette, setFreeRoulette] = useState(false);
  
  const [missions, setMissions] = useState<any[]>([]);
  const [lastMissionReset, setLastMissionReset] = useState<number>(Date.now());
  const [xp, setXp] = useState(0);
  
  const [is2D, setIs2D] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<UserProfile | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  const [opponentScore, setOpponentScore] = useState(0);
  
  const gameRef = useRef<StackGame | null>(null);
  const previousGameState = useRef<string>('start');

  useEffect(() => {
    const newSocket = io({
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error (expected in some environments):', err.message);
    });

    newSocket.on('player_joined', (data) => {
      setOpponent(data.profile);
      setIsWaiting(false);
    });

    newSocket.on('game_start', (data) => {
      const opp = data.p1.id === userProfile.id ? data.p2 : data.p1;
      setOpponent(opp);
      setIsWaiting(false);
      setGameState('playing');
      if (gameRef.current) {
        gameRef.current.startMultiplayer(opp);
      }
    });

    newSocket.on('opponent_placed_block', (data) => {
      if (gameRef.current) {
        gameRef.current.opponentPlacedBlock(data);
      }
    });

    newSocket.on('opponent_game_over', (data) => {
      if (gameRef.current) {
        gameRef.current.opponentGameOver(data.score);
      }
    });

    newSocket.on('opponent_disconnected', () => {
      setOpponent(null);
      setRoomId(null);
      setIsWaiting(false);
      if (gameState === 'playing' || gameState === 'multiplayer') {
        alert(lang === 'pt' ? 'Oponente desconectou.' : 'Opponent disconnected.');
        setGameState('start');
        if (gameRef.current) gameRef.current.endMultiplayer();
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userProfile.id, lang]);

  const handleCreateRoom = () => {
    if (socket) {
      setIsWaiting(true);
      setIsHost(true);
      socket.emit('create_room', { profile: userProfile }, (response: any) => {
        setRoomId(response.roomId);
      });
    }
  };

  const handleJoinRoom = (id: string) => {
    if (socket) {
      socket.emit('join_room', { roomId: id, profile: userProfile }, (response: any) => {
        if (response.success) {
          setRoomId(id);
          setOpponent(response.p1Profile);
          setIsWaiting(false);
          setIsHost(false);
        } else {
          alert(response.message);
        }
      });
    }
  };

  const handleStartMatch = () => {
    if (socket && roomId) {
      socket.emit('start_match', { roomId });
    }
  };

  const handlePlayBot = () => {
    const botProfile: UserProfile = {
      id: 'BOT',
      name: 'StackBot',
      avatar: '🤖',
      hoursPlayed: [24, 24, 24, 24, 24, 24, 24],
      savedPhotos: []
    };
    setOpponent(botProfile);
    setGameState('playing');
    if (gameRef.current) {
      gameRef.current.startMultiplayer(botProfile, true);
    }
  };

  const handleToggleCamera = () => {
    if (gameRef.current) {
      gameRef.current.toggleCamera();
      setIs2D(gameRef.current.is2D);
    }
  };

  useEffect(() => {
    if (gameState === 'gameover') {
      let earned = Math.floor(score / 30); // Earn 1 coin per 30 points
      if (score > highScore && score > 0) {
        const newHighScore = score;
        setHighScore(newHighScore);
        if (gameRef.current) {
          gameRef.current.setHighScore(newHighScore);
        }
        
        // Save to Supabase
        if (isSupabaseConfigured()) {
          supabaseService.saveProfile(userProfile, newHighScore);
        }

        earned += 2; // Small bonus for new record
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      if (earned > 0) {
        setSquares(c => {
          const newAmount = c + earned;
          localStorage.setItem('stackSquares', newAmount.toString());
          return newAmount;
        });
      }
    }
  }, [gameState, score, highScore]);

  useEffect(() => {
    const loadSupabaseProfile = async () => {
      const savedProfile = localStorage.getItem('stackProfile');
      if (savedProfile) {
        try {
          const localProfile = JSON.parse(savedProfile);
          if (isSupabaseConfigured()) {
            const remoteProfile = await supabaseService.getProfile(localProfile.id);
            if (remoteProfile) {
              const updatedProfile = {
                ...localProfile,
                name: remoteProfile.name || localProfile.name,
                avatar: remoteProfile.avatar || localProfile.avatar,
              };
              setUserProfile(updatedProfile);
              setHighScore(remoteProfile.high_score || 0);
              localStorage.setItem('stackProfile', JSON.stringify(updatedProfile));
            } else {
              setUserProfile(localProfile);
            }
          } else {
            setUserProfile(localProfile);
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      }
    };

    loadSupabaseProfile();

    const savedTheme = localStorage.getItem('stackTheme');
    if (savedTheme && THEMES.find(t => t.id === savedTheme)) {
      setThemeId(savedTheme);
    }
    const savedLang = localStorage.getItem('stackLang');
    if (savedLang === 'en' || savedLang === 'pt') {
      setLang(savedLang);
    }
    const savedProfile = localStorage.getItem('stackProfile');
    if (savedProfile) {
      try { setUserProfile(JSON.parse(savedProfile)); } catch (e) {}
    }
    const savedUnlocked = localStorage.getItem('stackUnlockedThemes');
    if (savedUnlocked) {
      try { setUnlockedThemes(JSON.parse(savedUnlocked)); } catch (e) {}
    }
    const savedCost = localStorage.getItem('stackRouletteCost');
    if (savedCost) setRouletteCost(parseInt(savedCost, 10));
    
    const savedSquares = localStorage.getItem('stackSquares');
    if (savedSquares) setSquares(Math.max(parseInt(savedSquares, 10), 0));
    
    const savedMissions = localStorage.getItem('stackMissions');
    const savedReset = localStorage.getItem('stackLastMissionReset');
    
    const generateDailyMissions = () => {
      const templates = [
        { type: 'play_games', pt: 'Jogar {x} partidas', en: 'Play {x} games', min: 2, max: 10 },
        { type: 'score_total', pt: 'Marcar {x} pontos no total', en: 'Score {x} points total', min: 30, max: 150 },
        { type: 'score_single', pt: 'Marcar {x} pontos em uma partida', en: 'Score {x} points in one game', min: 10, max: 40 },
        { type: 'perfect_combo', pt: 'Colocar {x} blocos perfeitos seguidos', en: 'Place {x} perfect blocks in a row', min: 3, max: 12 },
        { type: 'blocks_total', pt: 'Colocar {x} blocos no total', en: 'Place {x} blocks total', min: 50, max: 300 },
      ];

      const newMissions = [];
      let idCounter = 1;

      // 5 Coin Missions
      for (let i = 0; i < 5; i++) {
        const t = templates[Math.floor(Math.random() * templates.length)];
        const target = Math.floor(Math.random() * (t.max - t.min + 1)) + t.min;
        const reward = Math.floor(Math.random() * 11) + 15; // 15 to 25
        newMissions.push({
          id: `m_${idCounter++}`,
          titlePt: t.pt.replace('{x}', target.toString()),
          titleEn: t.en.replace('{x}', target.toString()),
          progress: 0,
          target: target,
          reward: reward,
          rewardType: 'squares',
          completed: false,
          type: t.type
        });
      }

      // 20 XP Missions
      for (let i = 0; i < 20; i++) {
        const t = templates[Math.floor(Math.random() * templates.length)];
        const target = Math.floor(Math.random() * (t.max - t.min + 1)) + t.min;
        const reward = Math.floor(Math.random() * 11) + 15; // 15 to 25
        newMissions.push({
          id: `m_${idCounter++}`,
          titlePt: t.pt.replace('{x}', target.toString()),
          titleEn: t.en.replace('{x}', target.toString()),
          progress: 0,
          target: target,
          reward: reward,
          rewardType: 'xp',
          completed: false,
          type: t.type
        });
      }

      return newMissions;
    };

    let currentMissions: any[] = [];
    let lastReset = savedReset ? parseInt(savedReset, 10) : Date.now();

    if (savedMissions) {
      try { 
        const parsed = JSON.parse(savedMissions);
        if (parsed && parsed.length > 0) {
          currentMissions = parsed;
        }
      } catch (e) {}
    }

    // Check if it's a new day or no missions exist or old format
    const lastResetDate = new Date(lastReset);
    const now = new Date();
    if (currentMissions.length === 0 || !currentMissions[0]?.type || lastResetDate.getDate() !== now.getDate() || lastResetDate.getMonth() !== now.getMonth() || lastResetDate.getFullYear() !== now.getFullYear()) {
      // Generate new daily missions
      currentMissions = generateDailyMissions();
      lastReset = now.getTime();
      localStorage.setItem('stackLastMissionReset', lastReset.toString());
      localStorage.setItem('stackMissions', JSON.stringify(currentMissions));
    }

    setMissions(currentMissions);
    setLastMissionReset(lastReset);
    
    const savedXp = localStorage.getItem('stackXp');
    if (savedXp) setXp(parseInt(savedXp, 10));
  }, []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setTheme(themeId);
      localStorage.setItem('stackTheme', themeId);
    }
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('stackLang', lang);
  }, [lang]);

  const handleStart = () => {
    if (gameRef.current) {
      gameRef.current.start();
    }
  };

  const handleRestart = () => {
    if (gameRef.current) {
      gameRef.current.initGame();
      gameRef.current.start();
    }
  };

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    if (gameRef.current) {
      gameRef.current.playTick();
    }
  };

  const handleMissionProgress = (type: string, value: number) => {
    setMissions(prev => {
      const updated = prev.map(m => {
        if (m.completed) return m;
        let newProgress = m.progress;
        if (m.type === type) {
          if (type === 'score_total' || type === 'blocks_total' || type === 'play_games') {
            newProgress += value;
          } else if (type === 'score_single' || type === 'perfect_combo') {
            newProgress = Math.max(m.progress, value);
          }
        }
        
        return { ...m, progress: Math.min(newProgress, m.target) };
      });
      localStorage.setItem('stackMissions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGameOver = (finalScore: number, screenshot: string, stats: { maxPerfectCombo: number, blocksPlaced: number, opponentScore?: number }) => {
    setLastScreenshot(screenshot);
    
    if (stats.opponentScore !== undefined) {
      setOpponentScore(stats.opponentScore);
    } else {
      setOpponentScore(0);
    }
    
    if (socket && roomId) {
      socket.emit('game_over', { roomId, score: finalScore });
    }

    // Update game count mission
    setMissions(prev => {
      const updated = prev.map(m => {
        if (m.completed) return m;
        let newProgress = m.progress;
        if (m.type === 'play_games') newProgress += 1; // Play games
        
        return { ...m, progress: Math.min(newProgress, m.target) };
      });
      localStorage.setItem('stackMissions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSavePhoto = () => {
    if (!lastScreenshot) return;
    setUserProfile(prev => {
      const newProfile = {
        ...prev,
        savedPhotos: [lastScreenshot, ...prev.savedPhotos].slice(0, 20) // Keep last 20 photos
      };
      localStorage.setItem('stackProfile', JSON.stringify(newProfile));
      return newProfile;
    });
  };

  const handleMainMenu = () => {
    setGameState('start');
    setOpponent(null);
    setRoomId(null);
    setIsWaiting(false);
    if (gameRef.current) {
      gameRef.current.endMultiplayer();
      gameRef.current.initGame();
    }
  };

  const handleSpinStart = () => {
    const lockedThemes = THEMES.filter(t => !unlockedThemes.includes(t.id));
    if (lockedThemes.length === 0 || (!freeRoulette && squares < rouletteCost)) return null;

    if (!freeRoulette) {
      setSquares(c => c - rouletteCost);
      setRouletteCost(c => Math.floor(c * 1.5));
      localStorage.setItem('stackRouletteCost', Math.floor(rouletteCost * 1.5).toString());
    }

    // Calculate probabilities based on rarity
    const rarityWeights = {
      common: 60,
      epic: 30,
      legendary: 10
    };

    let totalWeight = 0;
    const weightedThemes = lockedThemes.map(theme => {
      const weight = rarityWeights[theme.rarity] || 10;
      totalWeight += weight;
      return { theme, weight };
    });

    let random = Math.random() * totalWeight;
    let selectedTheme = lockedThemes[0];

    for (const item of weightedThemes) {
      random -= item.weight;
      if (random <= 0) {
        selectedTheme = item.theme;
        break;
      }
    }

    return selectedTheme.id;
  };

  const handleSpinEnd = (id: string) => {
    setUnlockedThemes(prev => {
      const next = [...prev, id];
      localStorage.setItem('stackUnlockedThemes', JSON.stringify(next));
      return next;
    });
    setThemeId(id);
  };

  const handleBuyTheme = (id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (!theme || unlockedThemes.includes(id)) return;

    if (squares >= theme.price) {
      setSquares(s => s - theme.price);
      setUnlockedThemes(prev => {
        const next = [...prev, id];
        localStorage.setItem('stackUnlockedThemes', JSON.stringify(next));
        return next;
      });
      setThemeId(id);
    }
  };

  const handleClaimReward = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.progress < mission.target || mission.completed) return;

    if (mission.rewardType === 'xp') {
      setXp(x => {
        const oldLevel = Math.floor(x / 1000) + 1;
        const newXp = x + mission.reward;
        const newLevel = Math.floor(newXp / 1000) + 1;
        
        if (newLevel > oldLevel) {
          // Award 50 coins on level up
          setSquares(s => {
            const newSquares = s + 50;
            localStorage.setItem('stackSquares', newSquares.toString());
            return newSquares;
          });
        }
        
        localStorage.setItem('stackXp', newXp.toString());
        return newXp;
      });
    } else if (mission.rewardType === 'squares') {
      setSquares(c => {
        const newAmount = c + mission.reward;
        localStorage.setItem('stackSquares', newAmount.toString());
        return newAmount;
      });
    }

    setMissions(prev => {
      const updated = prev.map(m => m.id === missionId ? { ...m, completed: true } : m);
      localStorage.setItem('stackMissions', JSON.stringify(updated));
      return updated;
    });
  };

  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const hasCompletedMissions = missions.some(m => m.progress >= m.target && !m.completed);

  const handleIntroComplete = React.useCallback(() => {
    setGameState('tutorial');
  }, []);

  const handleTutorialComplete = React.useCallback(() => {
    if (!userProfile.name) {
      setGameState('name_prompt');
    } else {
      setGameState('start');
    }
  }, [userProfile.name]);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden font-sans transition-colors duration-1000"
      style={{ backgroundImage: `linear-gradient(to bottom, ${currentTheme.bg[0]}, ${currentTheme.bg[1]})` }}
    >
      <Particles />
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState} 
        setScore={setScore} 
        setPerfectCombo={setPerfectCombo}
        gameRef={gameRef} 
        onGameOver={handleGameOver}
        onMissionProgress={handleMissionProgress}
        onPlaceBlock={(data) => {
          if (socket && roomId) {
            socket.emit('place_block', { roomId, ...data });
          }
        }}
      />
      {gameState === 'intro' && (
        <IntroCutscene onComplete={handleIntroComplete} />
      )}
      {gameState === 'tutorial' && (
        <TutorialOverlay onComplete={handleTutorialComplete} lang={lang} />
      )}
      {gameState === 'name_prompt' && (
        <NamePrompt 
          lang={lang} 
          onComplete={(name) => {
            const updatedProfile = { ...userProfile, name };
            setUserProfile(updatedProfile);
            localStorage.setItem('stackProfile', JSON.stringify(updatedProfile));
            if (isSupabaseConfigured()) {
              supabaseService.saveProfile(updatedProfile, highScore);
            }
            setGameState('start');
          }} 
        />
      )}
      <UI 
        gameState={gameState} 
        score={score} 
        perfectCombo={perfectCombo}
        highScore={highScore} 
        onStart={handleStart} 
        onRestart={handleRestart} 
        themeId={themeId}
        setThemeId={handleThemeChange}
        lang={lang}
        setLang={setLang}
        onOpenThemes={() => {
          previousGameState.current = gameState;
          setGameState('theme_selection');
        }}
        onOpenProfile={() => {
          previousGameState.current = gameState;
          setGameState('profile');
        }}
        onOpenMultiplayer={() => {
          previousGameState.current = gameState;
          setGameState('multiplayer');
        }}
        onOpenMissions={() => {
          previousGameState.current = gameState;
          setGameState('missions');
        }}
        onOpenLeaderboard={() => {
          previousGameState.current = gameState;
          setGameState('leaderboard');
        }}
        lastScreenshot={lastScreenshot}
        onSavePhoto={handleSavePhoto}
        onMainMenu={handleMainMenu}
        squares={squares}
        unlockedThemes={unlockedThemes}
        freeRoulette={freeRoulette}
        onToggleFreeRoulette={() => setFreeRoulette(!freeRoulette)}
        hasCompletedMissions={hasCompletedMissions}
        onToggleCamera={handleToggleCamera}
        is2D={is2D}
        isMultiplayer={!!opponent}
        opponentScore={opponentScore}
        onRematch={() => {
          if (opponent?.id === 'BOT') {
            handlePlayBot();
          } else {
            // For online, go back to lobby for now
            setGameState('multiplayer');
            setIsWaiting(false);
            setRoomId(null);
            setOpponent(null);
          }
        }}
      />
      {gameState === 'theme_selection' && (
        <ThemeSelector 
          onBack={() => setGameState(previousGameState.current)}
          onSelect={(id) => {
            handleThemeChange(id);
            if (previousGameState.current === 'gameover') {
              handleRestart();
            } else {
              setGameState('start');
            }
          }}
          currentThemeId={themeId}
          lang={lang}
          unlockedThemes={unlockedThemes}
          squares={squares}
          rouletteCost={rouletteCost}
          onSpinStart={handleSpinStart}
          onSpinEnd={handleSpinEnd}
          freeRoulette={freeRoulette}
          onToggleFreeRoulette={() => setFreeRoulette(!freeRoulette)}
          onBuyTheme={handleBuyTheme}
        />
      )}
      {gameState === 'profile' && (
        <Profile 
          profile={userProfile}
          onUpdateProfile={(p) => {
            setUserProfile(p);
            localStorage.setItem('stackProfile', JSON.stringify(p));
            if (isSupabaseConfigured()) {
              supabaseService.saveProfile(p, highScore);
            }
          }}
          onBack={() => setGameState(previousGameState.current)}
          lang={lang}
        />
      )}
      {gameState === 'multiplayer' && (
        <MultiplayerLobby
          onBack={() => {
            setGameState(previousGameState.current);
            setIsWaiting(false);
            setRoomId(null);
            setOpponent(null);
            setIsHost(false);
          }}
          lang={lang}
          profile={userProfile}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onPlayBot={handlePlayBot}
          onStartMatch={handleStartMatch}
          roomId={roomId}
          opponent={opponent}
          isWaiting={isWaiting}
          isHost={isHost}
        />
      )}
      {gameState === 'missions' && (
        <Missions 
          onBack={() => setGameState(previousGameState.current)}
          lang={lang}
          missions={missions.map(m => ({
            ...m,
            title: lang === 'pt' ? m.titlePt : m.titleEn
          }))}
          xp={xp}
          squares={squares}
          onClaimReward={handleClaimReward}
          onWatchAd={() => {
            setSquares(s => {
              const newAmount = s + 10;
              localStorage.setItem('stackSquares', newAmount.toString());
              return newAmount;
            });
          }}
        />
      )}
      {gameState === 'leaderboard' && (
        <Leaderboard 
          onBack={() => setGameState(previousGameState.current)}
          lang={lang}
          currentScore={score}
          highScore={highScore}
          userProfile={userProfile}
        />
      )}
    </div>
  );
}
