import React, { useEffect, useRef } from 'react';
import { StackGame } from '../game/StackGame';

interface GameCanvasProps {
  gameState: string;
  setGameState: (state: string) => void;
  setScore: (score: number) => void;
  setPerfectCombo: (combo: number) => void;
  gameRef: React.MutableRefObject<StackGame | null>;
  onGameOver?: (score: number, screenshot: string, stats: { maxPerfectCombo: number, blocksPlaced: number }) => void;
  onMissionProgress?: (type: string, value: number) => void;
  onPlaceBlock?: (data: any) => void;
}

export function GameCanvas({ gameState, setGameState, setScore, setPerfectCombo, gameRef, onGameOver, onMissionProgress, onPlaceBlock }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new StackGame(containerRef.current, {
      onScoreChange: (score: number) => setScore(score),
      onPerfectCombo: (combo: number) => setPerfectCombo(combo),
      onStateChange: (state: string) => setGameState(state),
      onGameOver: (score: number, screenshot: string, stats: { maxPerfectCombo: number, blocksPlaced: number }) => {
        if (onGameOver) onGameOver(score, screenshot, stats);
      },
      onMissionProgress: (type: string, value: number) => {
        if (onMissionProgress) onMissionProgress(type, value);
      },
      onPlaceBlock: (data: any) => {
        if (onPlaceBlock) onPlaceBlock(data);
      }
    });

    gameRef.current = game;

    return () => {
      game.destroy();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full cursor-pointer touch-none"
      onPointerDown={(e) => {
        if (gameState === 'intro') return;
        if (gameRef.current && gameRef.current.onPointerDown(e.clientX, e.clientY)) {
          isDragging.current = true;
          return;
        }
        pointerStartY.current = e.clientY;
        pointerStartX.current = e.clientX;
        isDragging.current = false;
      }}
      onPointerMove={(e) => {
        if (gameState === 'intro') return;
        if (gameRef.current && gameRef.current.onPointerMove(e.clientX, e.clientY)) {
          return;
        }
        if (pointerStartY.current !== null && pointerStartX.current !== null) {
          const deltaY = pointerStartY.current - e.clientY;
          const deltaX = pointerStartX.current - e.clientX;
          
          if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
            isDragging.current = true;
          }
          
          if (isDragging.current && gameRef.current) {
            if (gameState === 'gameover') {
              // Rotate camera around the tower
              gameRef.current.targetCameraAngle += deltaX * 0.01;
              
              // Also allow zooming
              gameRef.current.targetZoomMultiplier += deltaY * 0.005;
              gameRef.current.targetZoomMultiplier = Math.max(0.5, Math.min(gameRef.current.targetZoomMultiplier, 3));
            } else {
              // Just zoom
              gameRef.current.targetZoomMultiplier += deltaY * 0.005;
              gameRef.current.targetZoomMultiplier = Math.max(0.5, Math.min(gameRef.current.targetZoomMultiplier, 3));
            }
            
            pointerStartY.current = e.clientY;
            pointerStartX.current = e.clientX;
          }
        }
      }}
      onPointerUp={() => {
        if (gameState === 'intro') {
          pointerStartY.current = null;
          pointerStartX.current = null;
          isDragging.current = false;
          return;
        }
        if (gameRef.current && gameRef.current.onPointerUp()) {
          isDragging.current = false;
          pointerStartY.current = null;
          pointerStartX.current = null;
          return;
        }
        if (!isDragging.current && gameRef.current) {
          if (gameRef.current.state === 'start') {
            gameRef.current.start();
          } else if (gameRef.current.state === 'playing') {
            gameRef.current.placeBlock();
          }
        }
        pointerStartY.current = null;
        pointerStartX.current = null;
        isDragging.current = false;
      }}
      onPointerLeave={() => {
        pointerStartY.current = null;
        pointerStartX.current = null;
        isDragging.current = false;
      }}
    />
  );
}
