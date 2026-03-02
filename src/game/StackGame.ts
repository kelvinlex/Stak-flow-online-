import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { THEMES, Theme } from './Themes';

const BLOCK_HEIGHT = 1;
const ORIGINAL_BOX_SIZE = 5;
const TOLERANCE = 0.2;
const SPEED_INITIAL = 0.11;

export class StackGame {
  container: HTMLElement;
  callbacks: any;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  
  stack: THREE.Mesh[] = [];
  physicsBodies: { mesh: THREE.Mesh, body: CANNON.Body }[] = [];
  physicsWorld: CANNON.World;
  
  workingBlock: THREE.Mesh | null = null;
  
  state: string = 'start';
  score: number = 0;
  
  perfectCombo: number = 0;
  maxPerfectCombo: number = 0;
  blocksPlaced: number = 0;
  
  axis: 'x' | 'z' = 'x';
  direction: number = 1;
  speed: number = SPEED_INITIAL;
  
  animationFrameId: number = 0;
  
  hue: number = Math.random() * 360;
  
  currentW: number = ORIGINAL_BOX_SIZE;
  currentD: number = ORIGINAL_BOX_SIZE;
  
  cameraTargetY: number = 0;
  
  audioCtx: AudioContext | null = null;
  
  particles: THREE.Points | null = null;
  shadowPlane: THREE.Mesh | null = null;
  animatedInstancedMesh: THREE.InstancedMesh | null = null;
  animatedData: { position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, velocity: THREE.Vector3, rotVelocity: THREE.Vector3, type?: string }[] = [];
  pointLight: THREE.PointLight;
  
  zoomMultiplier: number = 1;
  targetZoomMultiplier: number = 1;
  targetCameraAngle: number = Math.PI / 4;
  
  currentTheme: Theme = THEMES[0];
  currentMusicStyleId: string = 'theme_default';
  isMuted: boolean = false;
  
  bgmStarted: boolean = false;
  bgmMasterGain: GainNode | null = null;
  bgmOscillators: OscillatorNode[] = [];
  bgmGains: GainNode[] = [];
  delayNode: DelayNode | null = null;
  feedbackGain: GainNode | null = null;
  
  jellyWobble: number = 0;
  cameraShake: number = 0;
  
  lastTime: number = 0;
  
  environmentGroup: THREE.Group = new THREE.Group();
  heightMarkersGroup: THREE.Group = new THREE.Group();
  reflectionGroup: THREE.Group = new THREE.Group();
  
  highScore: number = 0;
  highScoreMarker: THREE.Group | null = null;
  
  // Multiplayer State
  isMultiplayer: boolean = false;
  isBotMatch: boolean = false;
  opponent: any = null;
  opponentStack: THREE.Mesh[] = [];
  opponentWorkingBlock: THREE.Mesh | null = null;
  opponentAxis: 'x' | 'z' = 'x';
  opponentDirection: number = 1;
  opponentSpeed: number = 0.15;
  opponentScore: number = 0;
  opponentTag: THREE.Group | null = null;
  botInterval: NodeJS.Timeout | null = null;
  botMoveCount: number = 0;
  botState: 'focused' | 'distracted' = 'focused';
  opponentIsGameOver: boolean = false;
  
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  dragBody: CANNON.Body | null = null;
  dragPlane = new THREE.Plane();
  dragOffset = new THREE.Vector3();
  dragIntersection = new THREE.Vector3();
  
  pointerX: number = 0;
  pointerY: number = 0;
  
  startMultiplayer(opponentProfile: any, isBot: boolean = false) {
    this.isMultiplayer = true;
    this.isBotMatch = isBot;
    this.opponent = opponentProfile;
    this.opponentScore = 0;
    this.opponentIsGameOver = false;
    
    // Position camera to see both stacks
    this.camera.position.set(15, 15, 15);
    this.targetZoomMultiplier = 1.2;
    
    // Create opponent tag
    this.createOpponentTag();
    
    this.initGame();
    this.start();

    if (this.isBotMatch) {
      this.startBot();
    }
  }

  startBot() {
    if (this.botInterval) clearTimeout(this.botInterval);
    
    let botW = ORIGINAL_BOX_SIZE;
    let botD = ORIGINAL_BOX_SIZE;
    let botX = 0;
    let botZ = 0;
    this.botMoveCount = 0;
    
    const makeMove = () => {
      if (this.state !== 'playing') return;
      
      this.opponentScore++;
      this.botMoveCount++;
      
      // Change state occasionally to simulate human focus
      if (this.botMoveCount % Math.floor(Math.random() * 5 + 3) === 0) {
        // 60% chance to be focused, 40% distracted
        this.botState = Math.random() > 0.4 ? 'focused' : 'distracted';
      }
      
      let error = 0;
      let delay = 1000;
      
      if (this.botState === 'focused') {
        // Smart: Low error, faster
        // 30% chance of perfect move
        if (Math.random() < 0.3) {
            error = 0;
        } else {
            error = (Math.random() - 0.5) * 0.2; // Small error
        }
        delay = 600 + Math.random() * 400; // 0.6s - 1.0s
      } else {
        // Dumb: Higher error, slower
        error = (Math.random() - 0.5) * 1.5; // Larger error range
        delay = 1000 + Math.random() * 800; // 1.0s - 1.8s
      }
      
      // Apply error to position
      if (Math.random() > 0.5) botX += error;
      else botZ += error;
      
      // Trim size if error is large (simulate game mechanics)
      if (Math.abs(error) > TOLERANCE) {
        if (Math.random() > 0.5) botW -= Math.abs(error);
        else botD -= Math.abs(error);
      }
      
      if (botW <= 0 || botD <= 0) {
        // Bot lost
        this.opponentGameOver(this.opponentScore);
        return;
      }

      this.opponentPlacedBlock({
        w: botW,
        d: botD,
        x: botX,
        z: botZ,
        score: this.opponentScore
      });
      
      // Schedule next move
      this.botInterval = setTimeout(makeMove, delay);
    };
    
    // First move after 1 second
    this.botInterval = setTimeout(makeMove, 1000);
  }

  endMultiplayer() {
    this.isMultiplayer = false;
    this.isBotMatch = false;
    this.opponent = null;
    if (this.botInterval) {
      clearTimeout(this.botInterval);
      this.botInterval = null;
    }
    this.opponentStack.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
      else mesh.material.dispose();
    });
    this.opponentStack = [];
    if (this.opponentWorkingBlock) {
      this.scene.remove(this.opponentWorkingBlock);
      this.opponentWorkingBlock.geometry.dispose();
      this.opponentWorkingBlock = null;
    }
    if (this.opponentTag) {
      this.scene.remove(this.opponentTag);
      this.opponentTag = null;
    }
    this.targetZoomMultiplier = 1;
    this.initGame();
  }

  createOpponentTag() {
    if (this.opponentTag) this.scene.remove(this.opponentTag);
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.roundRect(0, 0, 256, 128, 16);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.opponent.name, 128, 40);
      
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.fillText(`Score: ${this.opponentScore}`, 128, 90);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 3, 1);
    
    this.opponentTag = new THREE.Group();
    this.opponentTag.add(sprite);
    // Opponent stack is at x = -15, z = -5
    this.opponentTag.position.set(-15, 5, -5);
    this.scene.add(this.opponentTag);
  }

  updateOpponentTag() {
    if (!this.opponentTag || !this.opponent) return;
    const sprite = this.opponentTag.children[0] as THREE.Sprite;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.roundRect(0, 0, 256, 128, 16);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.opponent.name, 128, 40);
      
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.fillText(`Score: ${this.opponentScore}`, 128, 90);
    }
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.needsUpdate = true;
    
    // Move tag up
    const y = this.opponentScore * BLOCK_HEIGHT + 5;
    this.opponentTag.position.y = y;
  }

  opponentPlacedBlock(data: any) {
    if (!this.isMultiplayer) return;
    
    const { w, d, x, z, score } = data;
    this.opponentScore = score;
    
    const geometry = this.currentTheme.createGeometry 
      ? this.currentTheme.createGeometry(w, BLOCK_HEIGHT, d) 
      : new THREE.BoxGeometry(w, BLOCK_HEIGHT, d);
    const material = this.currentTheme.getMaterial(this.opponentScore);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { w, h: BLOCK_HEIGHT, d };
    
    // Opponent stack is offset by x = -15, z = -5
    const y = this.opponentScore * BLOCK_HEIGHT;
    mesh.position.set(x - 15, y, z - 5);
    
    this.scene.add(mesh);
    this.opponentStack.push(mesh);
    
    // Create the next working block for the opponent
    if (this.opponentWorkingBlock) {
      this.scene.remove(this.opponentWorkingBlock);
      this.opponentWorkingBlock.geometry.dispose();
    }
    
    const nextScore = this.opponentScore + 1;
    this.opponentAxis = nextScore % 2 === 0 ? 'x' : 'z';
    this.opponentDirection = 1;
    this.opponentSpeed = 0.15 + (nextScore * 0.005);
    
    const nextGeo = this.currentTheme.createGeometry 
      ? this.currentTheme.createGeometry(w, BLOCK_HEIGHT, d) 
      : new THREE.BoxGeometry(w, BLOCK_HEIGHT, d);
    const nextMat = this.currentTheme.getMaterial(nextScore);
    this.opponentWorkingBlock = new THREE.Mesh(nextGeo, nextMat);
    this.opponentWorkingBlock.userData = { w, h: BLOCK_HEIGHT, d };
    this.opponentWorkingBlock.castShadow = true;
    this.opponentWorkingBlock.receiveShadow = true;
    
    const startPos = -10;
    const nextY = nextScore * BLOCK_HEIGHT;
    
    if (this.opponentAxis === 'x') {
      this.opponentWorkingBlock.position.set(startPos - 15, nextY, z - 5);
    } else {
      this.opponentWorkingBlock.position.set(x - 15, nextY, startPos - 5);
    }
    
    this.scene.add(this.opponentWorkingBlock);
    
    this.updateOpponentTag();
  }

  opponentGameOver(score: number) {
    if (!this.isMultiplayer) return;
    this.opponentScore = score;
    this.opponentIsGameOver = true;
    if (this.opponentWorkingBlock) {
      this.scene.remove(this.opponentWorkingBlock);
      this.opponentWorkingBlock = null;
    }
    if (this.state === 'spectating') {
      this.triggerFinalGameOver();
    }
  }

  setHighScore(score: number) {
    this.highScore = score;
    this.updateHighScoreMarker();
  }

  updateHighScoreMarker() {
    if (this.highScore <= 0) return;
    
    if (!this.highScoreMarker) {
      this.highScoreMarker = new THREE.Group();
      
      // Create a dashed line
      const lineMaterial = new THREE.LineDashedMaterial({
        color: 0xffd700,
        linewidth: 2,
        scale: 1,
        dashSize: 1,
        gapSize: 1,
        transparent: true,
        opacity: 0.6
      });
      
      const points = [];
      points.push(new THREE.Vector3(-10, 0, -10));
      points.push(new THREE.Vector3(10, 0, -10));
      points.push(new THREE.Vector3(10, 0, 10));
      points.push(new THREE.Vector3(-10, 0, 10));
      points.push(new THREE.Vector3(-10, 0, -10));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      line.computeLineDistances();
      
      // Create a small flag/label
      const flagGeo = new THREE.PlaneGeometry(3, 1);
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RECORD', 64, 32);
      }
      const flagTex = new THREE.CanvasTexture(canvas);
      const flagMat = new THREE.MeshBasicMaterial({ map: flagTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(-8, 0.5, 8);
      flag.rotation.y = Math.PI / 4;
      
      this.highScoreMarker.add(line);
      this.highScoreMarker.add(flag);
      this.scene.add(this.highScoreMarker);
    }
    
    // Position the marker at the height of the high score block
    // The first block is at y=0.5, second at 1.5, etc.
    // So score N is at height N * BLOCK_HEIGHT + 0.5
    this.highScoreMarker.position.y = this.highScore * BLOCK_HEIGHT + 0.5;
  }

  initAudio = () => {
    if (this.bgmStarted) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.bgmStarted = true;

      this.bgmMasterGain = this.audioCtx.createGain();
      this.bgmMasterGain.gain.value = 0.04; // Smooth neural volume
      
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150; // Very deep and muffled
      
      // Breathing effect for the filter (slowly opens and closes)
      const filterLfo = this.audioCtx.createOscillator();
      filterLfo.type = 'sine';
      filterLfo.frequency.value = 0.05; // 20 seconds per cycle
      const filterLfoGain = this.audioCtx.createGain();
      filterLfoGain.gain.value = 50; // Sweep by +/- 50Hz
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);
      filterLfo.start();
      
      this.bgmMasterGain.connect(filter);
      filter.connect(this.audioCtx.destination);

      // Create Delay/Reverb effect for cinematic space
      this.delayNode = this.audioCtx.createDelay();
      this.delayNode.delayTime.value = 0.4; // 400ms delay
      
      this.feedbackGain = this.audioCtx.createGain();
      this.feedbackGain.gain.value = 0.5; // 50% feedback
      
      const delayFilter = this.audioCtx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1000; // Darken the echoes
      
      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode);
      this.delayNode.connect(this.audioCtx.destination);

      // Create a single thick "Neural" drone using binaural beats
      const createNeuralDrone = (pan: number, detuneHz: number) => {
        const osc = this.audioCtx!.createOscillator();
        osc.type = 'sine'; // Pure tone for deep relaxation
        
        const gain = this.audioCtx!.createGain();
        gain.gain.value = 0.2; // Softer volume
        
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300; // Very soft, muffled sound
        
        const panner = this.audioCtx!.createStereoPanner();
        panner.pan.value = pan;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.bgmMasterGain!);
        
        osc.start();
        
        (osc as any).detuneHz = detuneHz;
        this.bgmOscillators.push(osc);
        this.bgmGains.push(gain);
      };

      // 3 tightly grouped frequencies to create a 4Hz Theta brainwave beat
      createNeuralDrone(0, 0);       // Center: Base frequency
      createNeuralDrone(-1, -2);     // Left ear: Base - 2Hz
      createNeuralDrone(1, 2);       // Right ear: Base + 2Hz
      
      this.updateBGMTheme();
      this.startAtmosphericPulses();

    } catch (e) {
      console.error('Audio init error', e);
    }
    window.removeEventListener('click', this.initAudio);
    window.removeEventListener('touchstart', this.initAudio);
  }

  startAtmosphericPulses() {
    const scheduleNext = () => {
      if (!this.bgmStarted || !this.audioCtx) return;
      
      const delay = Math.random() * 10000 + 5000; // Every 5-15 seconds
      setTimeout(() => {
        this.playCinematicPulse();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  playCinematicPulse() {
    if (!this.audioCtx || this.isMuted || this.currentMusicStyleId === 'none') return;
    const freq = this.currentTheme.baseFreq * 0.5; // Deep sub-bass
    const duration = 4.0;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, this.audioCtx.currentTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  setMusicStyle(styleId: string) {
    this.currentMusicStyleId = styleId;
    this.updateBGMTheme();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.bgmMasterGain && this.audioCtx) {
      this.bgmMasterGain.gain.setTargetAtTime(muted ? 0 : 0.015, this.audioCtx.currentTime, 0.5);
    }
  }

  updateBGMTheme() {
    if (!this.bgmStarted || this.bgmOscillators.length === 0) return;
    
    // Stop music if "none" is selected
    if (this.currentMusicStyleId === 'none') {
      this.bgmOscillators.forEach(osc => {
        try {
          const now = this.audioCtx!.currentTime;
          // Fade out
          // The drones are background. Let's silence them too.
           osc.frequency.setTargetAtTime(0, now, 0.5);
        } catch(e) {}
      });
      return;
    }
    
    let base = 136.1; // Deep Om frequency
    let detuneMultiplier = 2; // 4Hz difference between left and right (2 * 2)
    
    if (this.currentMusicStyleId === 'neural_wave' || this.currentMusicStyleId === 'theme_default') {
      const now = this.audioCtx!.currentTime;
      this.bgmOscillators.forEach((osc, index) => {
        let detuneHz = 0;
        if (index === 1) detuneHz = -detuneMultiplier;
        if (index === 2) detuneHz = detuneMultiplier;
        osc.frequency.setTargetAtTime(base + detuneHz, now, 2.0); 
      });
    }
  }

  playNote(freq: number, type: OscillatorType = 'sine', duration: number = 0.8, volume: number = 0.1, useDelay: boolean = false, pan: number = 0, isMusic: boolean = false, envelopeType: 'pad' | 'pluck' = 'pad') {
    if (this.isMuted && isMusic) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();
      const panner = this.audioCtx.createStereoPanner();
      
      panner.pan.value = pan;
      
      // Low-pass filter for muffled/cinematic sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.0, now); // Start a bit brighter
      filter.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration * 0.8);
      filter.Q.value = 3; // Nice resonance for a "plucky" but soft feel
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      
      // Envelope
      let attack = 0.02;
      let decay = duration * 0.3;
      let sustain = volume * 0.4;
      let release = duration * 0.7;

      if (envelopeType === 'pluck') {
        attack = 0.005;
        decay = duration * 0.8;
        sustain = 0.0001;
        release = duration * 0.2;
        
        // Brighter start for pluck
        filter.frequency.setValueAtTime(freq * 5.0, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 0.5, now + decay);
      }
      
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + attack);
      if (envelopeType === 'pad') {
        gain.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay + release);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.audioCtx.destination);
      
      if (useDelay && this.delayNode) {
        // Send to delay with a slightly lower volume for a lush tail
        const delaySend = this.audioCtx.createGain();
        delaySend.gain.value = 0.4;
        panner.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
      
      osc.start(now);
      osc.stop(now + attack + decay + release + 0.1);
    } catch (e) {
      console.error('Audio error', e);
    }
  }

  playBlockHit(pan: number) {
    if (!this.audioCtx || this.isMuted) return;
    const now = this.audioCtx.currentTime;
    
    // 1. Low Thud (Weight) - Sine wave dropping in pitch
    const subOsc = this.audioCtx.createOscillator();
    const subGain = this.audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(200, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    subOsc.connect(subGain);
    subGain.connect(this.audioCtx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.1);

    // 2. Wood/Stone Tone (Character) - Triangle wave fast drop
    const toneOsc = this.audioCtx.createOscillator();
    const toneGain = this.audioCtx.createGain();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(600, now);
    toneOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05); 
    toneGain.gain.setValueAtTime(0.4, now);
    toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    toneOsc.connect(toneGain);
    toneGain.connect(this.audioCtx.destination);
    toneOsc.start(now);
    toneOsc.stop(now + 0.08);

    // 3. Crisp Click (Definition) - High-passed noise
    const bufferSize = this.audioCtx.sampleRate * 0.01; // 10ms very short
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 3000; // Crisp top end
    
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.value = 0.5;
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
    
    const pannerNode = this.audioCtx.createStereoPanner();
    pannerNode.pan.value = pan * 0.5; // Subtle panning
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(pannerNode);
    pannerNode.connect(this.audioCtx.destination);
    
    noise.start(now);
    
    // 4. Musical Tone based on combo
    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const scaleIndex = this.stack.length % pentatonic.length;
    const octave = Math.floor(this.stack.length / pentatonic.length) % 2;
    const semitones = pentatonic[scaleIndex] + (octave * 12);
    const base = this.currentTheme.baseFreq * Math.pow(1.059463, semitones);
    this.playNote(base, this.currentTheme.soundType, 0.6, 0.15, false, pan, false, 'pluck');
  }

  playNormalSound(pan: number) {
    this.playBlockHit(pan);
  }

  playGameOverSound() {
    if (!this.audioCtx) return;
    const base = this.currentTheme.baseFreq;
    const now = this.audioCtx.currentTime;

    // 1. Dissonant descending chord (The "Fail")
    this.playNote(base * 0.5, 'sawtooth', 2.0, 0.2, true, 0);
    this.playNote(base * 0.45, 'sawtooth', 2.5, 0.15, true, -0.5);
    this.playNote(base * 0.4, 'sawtooth', 3.0, 0.15, true, 0.5);

    // 2. Deep Sub-bass drop (The "Impact")
    const subOsc = this.audioCtx.createOscillator();
    const subGain = this.audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(100, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    
    subOsc.connect(subGain);
    subGain.connect(this.audioCtx.destination);
    subOsc.start(now);
    subOsc.stop(now + 2.0);

    // 3. Noise sweep (The "Crumble")
    const bufferSize = this.audioCtx.sampleRate * 1.0; // 1 second of noise
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 1.0);
    
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    
    noise.start(now);
  }

  playPerfectSound() {
    // Increase pitch based on combo length using pentatonic scale
    const pentatonic = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const scaleIndex = this.perfectCombo % pentatonic.length;
    const octave = Math.floor(this.perfectCombo / pentatonic.length) % 2;
    const semitones = pentatonic[scaleIndex] + (octave * 12);
    const base = this.currentTheme.baseFreq * Math.pow(1.059463, semitones);
    
    // 1. The "Snap" (Immediate crisp feedback)
    this.playNote(base * 4, 'sine', 0.2, 0.15, false, 0, false, 'pluck');

    // 2. The "Chord" (Reward) - Ethereal Major Triad with wide stereo
    // Root
    this.playNote(base, this.currentTheme.soundType, 2.5, 0.3, true, -0.3, false, 'pluck');
    // Major 3rd (Just Intonation 5/4 for purity)
    this.playNote(base * 1.25, this.currentTheme.soundType, 2.5, 0.2, true, 0.3, false, 'pluck'); 
    // Perfect 5th (Just Intonation 3/2 for purity)
    this.playNote(base * 1.5, this.currentTheme.soundType, 2.5, 0.2, true, 0, false, 'pluck');
    
    // Add an octave up if combo is high
    if (this.perfectCombo > 3) {
      this.playNote(base * 2, 'sine', 3.0, 0.15, true, 0, false, 'pluck');
    }

    // 3. The "Shimmer" (Magic) - Delayed high sparkles
    setTimeout(() => {
        this.playNote(base * 4, 'triangle', 1.5, 0.05, true, -0.6, false, 'pluck');
    }, 40);
    setTimeout(() => {
        this.playNote(base * 6, 'triangle', 1.5, 0.05, true, 0.6, false, 'pluck');
    }, 80);
    if (this.perfectCombo > 5) {
      setTimeout(() => {
          this.playNote(base * 8, 'sine', 2.0, 0.05, true, 0, false, 'pluck');
      }, 120);
    }

    // 4. Deep Bass (Satisfaction/Weight)
    this.playNote(base * 0.25, 'sine', 1.5, 0.5, false, 0, false, 'pad');
  }

  playTick() {
    const pan = this.axis === 'x' ? (this.direction === 1 ? -0.3 : 0.3) : 0;
    this.playNote(800, 'sine', 0.05, 0.02, false, pan, false, 'pluck');
  }

  playSplashSound() {
    if (!this.audioCtx) return;
    const duration = 0.5;
    const now = this.audioCtx.currentTime;
    
    // 1. The "Bloop" (Main body)
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    const panner = this.audioCtx.createStereoPanner();
    
    // Rapidly descending frequency for a "bloop/splash"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration * 0.8);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioCtx.destination);
    
    if (this.delayNode) {
      const delaySend = this.audioCtx.createGain();
      delaySend.gain.value = 0.3;
      panner.connect(delaySend);
      delaySend.connect(this.delayNode);
    }
    
    osc.start(now);
    osc.stop(now + duration + 0.1);

    // 2. The "Slap" (High frequency transient)
    const slapOsc = this.audioCtx.createOscillator();
    const slapGain = this.audioCtx.createGain();
    slapOsc.type = 'triangle';
    slapOsc.frequency.setValueAtTime(1200, now);
    slapOsc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    
    slapGain.gain.setValueAtTime(0.0001, now);
    slapGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    
    slapOsc.connect(slapGain);
    slapGain.connect(this.audioCtx.destination);
    slapOsc.start(now);
    slapOsc.stop(now + 0.15);
  }

  spawnJellyParticles(pos: THREE.Vector3, color: THREE.Color) {
    const particleCount = 40;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pVel: {x: number, y: number, z: number}[] = [];
    for(let i=0; i<particleCount; i++) {
      pPos[i*3] = pos.x + (Math.random() - 0.5);
      pPos[i*3+1] = pos.y;
      pPos[i*3+2] = pos.z + (Math.random() - 0.5);
      pVel.push({
        x: (Math.random() - 0.5) * 0.4,
        y: Math.random() * 0.5 + 0.2,
        z: (Math.random() - 0.5) * 0.4
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ 
      color: color, 
      size: 0.8, 
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending
    });
    const pMesh = new THREE.Points(pGeo, pMat);
    this.scene.add(pMesh);

    const animateParticles = () => {
      if (pMat.opacity <= 0) {
        this.scene.remove(pMesh);
        pGeo.dispose();
        pMat.dispose();
        return;
      }
      
      const positions = pGeo.attributes.position.array as Float32Array;
      for(let i=0; i<particleCount; i++) {
        positions[i*3] += pVel[i].x;
        positions[i*3+1] += pVel[i].y;
        positions[i*3+2] += pVel[i].z;
        pVel[i].y -= 0.025; // gravity
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity -= 0.02;
      
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }

  is2D: boolean = false;
  
  toggleCamera() {
    this.is2D = !this.is2D;
    if (this.is2D) {
      this.targetCameraAngle = 0; // Front view
      this.targetZoomMultiplier = 1.5; // Zoom in a bit for 2D
    } else {
      this.targetCameraAngle = Math.PI / 4; // Isometric view
      this.targetZoomMultiplier = 1;
    }
  }

  constructor(container: HTMLElement, callbacks: any) {
    this.container = container;
    this.callbacks = callbacks;
    
    window.addEventListener('click', this.initAudio);
    window.addEventListener('touchstart', this.initAudio);
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015);
    
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, -BLOCK_HEIGHT / 2, 0);
    this.physicsWorld.addBody(groundBody);
    
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 100);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Sharper shadows
    this.container.appendChild(this.renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    this.scene.add(this.environmentGroup);
    this.scene.add(this.heightMarkersGroup);
    this.scene.add(this.reflectionGroup);
    this.buildEnvironment(this.currentTheme.id);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    // High resolution shadows for crispness
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.bias = -0.001; // Prevent shadow acne while keeping it sharp
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);
    this.scene.add(dirLight.target);
    
    // Remove the solid ground for shadows to create a floating effect
    // We'll rely on the smoke and the blocks themselves for depth
    
    // Cinematic Point Light
    this.pointLight = new THREE.PointLight(0xffffff, 2, 30);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
    
    // Create shadow plane under the base block
    this.createShadowPlane();
    
    // Removed ambient particles
    
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('wheel', this.onWheel);
    window.addEventListener('pointermove', this.onGlobalPointerMove);
    
    this.initGame();
    requestAnimationFrame(this.loop);
  }
  
  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('click', this.initAudio);
    window.removeEventListener('touchstart', this.initAudio);
    window.removeEventListener('pointermove', this.onGlobalPointerMove);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    // Fix audio memory leak / lag by properly closing the context when game is destroyed
    if (this.bgmOscillators) {
      this.bgmOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      this.bgmOscillators = [];
    }
    if (this.bgmMasterGain) {
      this.bgmMasterGain.disconnect();
    }
    if (this.delayNode) {
      this.delayNode.disconnect();
    }
    if (this.feedbackGain) {
      this.feedbackGain.disconnect();
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(e => console.error('Error closing audio context', e));
    }
  }

  onPointerUp() {
    if (this.dragBody) {
      this.dragBody = null;
      return true;
    }
    return false;
  }

  onPointerDown(clientX: number, clientY: number) {
    if (this.state !== 'gameover') return false;
    
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.physicsBodies.map(p => p.mesh));
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const physicsObj = this.physicsBodies.find(p => p.mesh === hitMesh);
      if (physicsObj && physicsObj.body.mass > 0) { // Only draggable if dynamic
        this.dragBody = physicsObj.body;
        this.dragBody.wakeUp();
        
        // Create a plane facing the camera to drag on
        this.dragPlane.setFromNormalAndCoplanarPoint(
          this.camera.getWorldDirection(this.dragPlane.normal),
          intersects[0].point
        );
        
        this.dragOffset.copy(intersects[0].point).sub(hitMesh.position);
        return true; // Handled
      }
    }
    return false;
  }
  
  onPointerMove(clientX: number, clientY: number) {
    if (!this.dragBody) return false;
    
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection);
    
    // Calculate velocity to move body to intersection point
    const targetPos = this.dragIntersection.clone().sub(this.dragOffset);
    
    const velX = (targetPos.x - this.dragBody.position.x) * 10;
    const velY = (targetPos.y - this.dragBody.position.y) * 10;
    const velZ = (targetPos.z - this.dragBody.position.z) * 10;
    
    this.dragBody.velocity.set(velX, velY, velZ);
    
    return true; // Handled
  }

  onWheel = (e: WheelEvent) => {
    this.targetZoomMultiplier += e.deltaY * 0.001;
    this.targetZoomMultiplier = Math.max(0.5, Math.min(this.targetZoomMultiplier, 3));
  }

  createShadowPlane() {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.ShadowMaterial({ opacity: 0.8 }); // Darker, sharper shadow
    this.shadowPlane = new THREE.Mesh(geometry, material);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = -BLOCK_HEIGHT / 2 - 0.01; // Just below the first block
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);
  }

  onGlobalPointerMove = (event: PointerEvent) => {
    this.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointerY = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  onWindowResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const d = 10;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createRadialGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }

  setTheme(themeId: string) {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      this.currentTheme = theme;
      
      this.buildEnvironment(themeId);
      this.createReflection();
      
      // Update existing blocks
      this.stack.forEach((b, i) => {
        if (Array.isArray(b.material)) {
          b.material.forEach(m => m.dispose());
        } else {
          b.material.dispose();
        }
        b.material = this.currentTheme.getMaterial(i);
      });
      
      if (this.workingBlock) {
        if (Array.isArray(this.workingBlock.material)) {
          this.workingBlock.material.forEach(m => m.dispose());
        } else {
          this.workingBlock.material.dispose();
        }
        this.workingBlock.material = this.currentTheme.getMaterial(this.stack.length);
      }
      
      this.physicsBodies.forEach((o, i) => {
        if (Array.isArray(o.mesh.material)) {
          o.mesh.material.forEach(m => m.dispose());
        } else {
          o.mesh.material.dispose();
        }
        o.mesh.material = this.currentTheme.getMaterial(this.stack.length);
      });
      
      this.updateBGMTheme();
    }
  }

  buildEnvironment(themeId: string) {
    while(this.environmentGroup.children.length > 0) {
      const child = this.environmentGroup.children[0];
      this.environmentGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: any) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    }

    // Remove gridHelper and add a glowing base light
    const baseGlowGeo = new THREE.PlaneGeometry(30, 30);
    const baseGlowMat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.previewColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.createRadialGradient()
    });
    const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.y = -BLOCK_HEIGHT / 2 + 0.01;
    this.environmentGroup.add(baseGlow);

    // Cinematic Floor
    const floorGeo = new THREE.PlaneGeometry(400, 400);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x050505,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -BLOCK_HEIGHT / 2 - 0.05;
    floor.receiveShadow = true;
    this.environmentGroup.add(floor);

    // Subtle Grid on the floor
    const gridHelper = new THREE.GridHelper(100, 50, 0xffffff, 0xffffff);
    gridHelper.position.y = -BLOCK_HEIGHT / 2 - 0.04;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.05;
    this.environmentGroup.add(gridHelper);

    if (themeId === 'forest') {
      const grassGeo = new THREE.PlaneGeometry(200, 200);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1.0 });
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = -BLOCK_HEIGHT / 2 - 0.1;
      grass.receiveShadow = true;
      this.environmentGroup.add(grass);

      for(let i=0; i<40; i++) {
        const tree = new THREE.Group();
        
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        const leavesGeo = new THREE.ConeGeometry(2.5, 6, 5);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b4d1b, roughness: 0.8 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 5;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);

        const angle = Math.random() * Math.PI * 2;
        const radius = 12 + Math.random() * 40;
        tree.position.set(Math.cos(angle) * radius, -BLOCK_HEIGHT/2, Math.sin(angle) * radius);
        
        const scale = 0.5 + Math.random() * 1.5;
        tree.scale.set(scale, scale, scale);

        this.environmentGroup.add(tree);
      }
    } else if (themeId === 'money') {
      const count = 150;
      const geo = new THREE.PlaneGeometry(2, 1);
      
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#85bb65';
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#2d5a27';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 120, 56);
        ctx.fillStyle = '#2d5a27';
        ctx.beginPath();
        ctx.arc(64, 32, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#85bb65';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 64, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      
      const mat = new THREE.MeshStandardMaterial({ 
        map: tex, 
        roughness: 0.8, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedInstancedMesh.castShadow = true;
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          Math.random() * 60 - 10,
          (Math.random() - 0.5) * 40
        );
        const rot = new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          -Math.random() * 0.1 - 0.05,
          (Math.random() - 0.5) * 0.05
        );
        const rotVel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        );
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'gold') {
      const count = 100;
      const geo = new THREE.OctahedronGeometry(0.5, 0);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, 
        roughness: 0.1, 
        metalness: 1.0,
        emissive: 0x443300
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedInstancedMesh.castShadow = true;
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          Math.random() * 60 - 10,
          (Math.random() - 0.5) * 40
        );
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3(0, Math.random() * 0.05 + 0.02, 0); // Floating up
        const rotVel = new THREE.Vector3(Math.random() * 0.05, Math.random() * 0.05, Math.random() * 0.05);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'diamond') {
      const count = 150;
      const geo = new THREE.TetrahedronGeometry(0.4, 0);
      const mat = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff,
        transmission: 1.0,
        opacity: 1,
        metalness: 0.2,
        roughness: 0.0,
        ior: 2.4,
        thickness: 2.0,
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 40, Math.random() * 60 - 10, (Math.random() - 0.5) * 40);
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3(0, Math.random() * 0.02 + 0.01, 0);
        const rotVel = new THREE.Vector3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'magma') {
      const count = 200;
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0xff3300,
        emissive: 0xff4500,
        emissiveIntensity: 2.0
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 30, Math.random() * 60 - 20, (Math.random() - 0.5) * 30);
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3((Math.random() - 0.5) * 0.05, Math.random() * 0.1 + 0.05, (Math.random() - 0.5) * 0.05); // Rising embers
        const rotVel = new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'matrix') {
      const count = 300;
      const geo = new THREE.BoxGeometry(0.1, 1.5, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 40, Math.random() * 60, (Math.random() - 0.5) * 40);
        const rot = new THREE.Euler(0, 0, 0);
        const vel = new THREE.Vector3(0, -Math.random() * 0.2 - 0.1, 0); // Falling fast
        const rotVel = new THREE.Vector3(0, 0, 0);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'space' || themeId === 'galaxy') {
      const count = 150;
      const geo = new THREE.DodecahedronGeometry(Math.random() * 0.5 + 0.2, 1);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 0.9,
        metalness: 0.1
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 60, Math.random() * 80 - 20, (Math.random() - 0.5) * 60);
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
        const rotVel = new THREE.Vector3(Math.random() * 0.01, Math.random() * 0.01, Math.random() * 0.01);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'cyberpunk' || themeId === 'synthwave') {
      const count = 100;
      const geo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        emissive: themeId === 'cyberpunk' ? 0xff0055 : 0x00ffff,
        emissiveIntensity: 1.5,
        wireframe: true
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 50, Math.random() * 60 - 10, (Math.random() - 0.5) * 50);
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3(0, Math.random() * 0.02 - 0.01, 0);
        const rotVel = new THREE.Vector3(Math.random() * 0.05, Math.random() * 0.05, Math.random() * 0.05);
        
        this.animatedData.push({ position: pos, rotation: rot, scale: new THREE.Vector3(1, 1, 1), velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'clay') {
      const count = 50;
      const geo = new THREE.SphereGeometry(1, 16, 16);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0xa0522d,
        roughness: 0.9,
        metalness: 0.0
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedInstancedMesh.castShadow = true;
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 40, Math.random() * 60 - 10, (Math.random() - 0.5) * 40);
        const rot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const vel = new THREE.Vector3(0, Math.random() * 0.02 - 0.01, 0);
        const rotVel = new THREE.Vector3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02);
        
        const scale = Math.random() * 1.5 + 0.5;
        const scaleVec = new THREE.Vector3(scale, scale * (Math.random() * 0.5 + 0.5), scale);
        this.animatedData.push({ position: pos, rotation: rot, scale: scaleVec, velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        
        // Randomly scale to make them look like different blobs
        dummy.scale.copy(scaleVec);
        
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else if (themeId === 'cartoon') {
      const count = 30;
      const geo = new THREE.BoxGeometry(2, 2, 2);
      const mat = new THREE.MeshToonMaterial({ 
        color: 0xffffff
      });
      
      this.animatedInstancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.animatedInstancedMesh.castShadow = true;
      this.animatedData = [];
      
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const pos = new THREE.Vector3((Math.random() - 0.5) * 60, Math.random() * 60 + 10, (Math.random() - 0.5) * 60);
        const rot = new THREE.Euler(0, 0, 0);
        const vel = new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, 0); // Drifting horizontally
        const rotVel = new THREE.Vector3(0, 0, 0);
        
        const scaleVec = new THREE.Vector3(Math.random() * 2 + 2, Math.random() * 0.5 + 0.5, Math.random() * 2 + 2);
        this.animatedData.push({ position: pos, rotation: rot, scale: scaleVec, velocity: vel, rotVelocity: rotVel });
        dummy.position.copy(pos);
        dummy.rotation.copy(rot);
        
        // Scale to look like clouds
        dummy.scale.copy(scaleVec);
        
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.environmentGroup.add(this.animatedInstancedMesh);
    } else {
      this.animatedInstancedMesh = null;
    }
  }

  addBlock(x: number, z: number, w: number, d: number) {
    const geometry = this.currentTheme.createGeometry 
      ? this.currentTheme.createGeometry(w, BLOCK_HEIGHT, d) 
      : new THREE.BoxGeometry(w, BLOCK_HEIGHT, d);
    const material = this.currentTheme.getMaterial(this.stack.length);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { w, h: BLOCK_HEIGHT, d };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const y = this.stack.length * BLOCK_HEIGHT;
    mesh.position.set(x, y, z);
    
    this.scene.add(mesh);
    this.stack.push(mesh);
    
    // Add height marker every 10 blocks (meters)
    if (this.stack.length % 10 === 0) {
      this.createHeightMarker(this.stack.length, y);
    }
    
    return mesh;
  }

  createHeightMarker(height: number, y: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Cinematic text style
      ctx.fillStyle = 'rgba(255, 255, 255, 0)'; // Transparent bg
      ctx.fillRect(0, 0, 128, 64);
      
      // Glow effect
      ctx.shadowColor = this.currentTheme.previewColor;
      ctx.shadowBlur = 10;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Courier New", monospace'; // Monospace for tech feel
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${height}m`, 10, 32);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      opacity: 0.8,
      depthTest: false // Always visible
    });
    
    const sprite = new THREE.Sprite(material);
    // Position very close to the stack
    sprite.position.set(ORIGINAL_BOX_SIZE/2 + 2.5, y, 0); 
    sprite.scale.set(4, 2, 1);
    
    const group = new THREE.Group();
    group.add(sprite);
    
    // Animate the marker floating
    const floatAnim = () => {
        if (!group.parent) return; // Stop if removed
        const time = Date.now() * 0.001;
        sprite.position.y = y + Math.sin(time + height) * 0.2;
        requestAnimationFrame(floatAnim);
    };
    floatAnim();

    this.heightMarkersGroup.add(group);
  }

  createReflection() {
    while(this.reflectionGroup.children.length > 0) {
      const child = this.reflectionGroup.children[0];
      this.reflectionGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    const height = 30;
    const geometry = new THREE.BoxGeometry(ORIGINAL_BOX_SIZE, height, ORIGINAL_BOX_SIZE);
    
    // Get base color from theme
    const baseMat = this.currentTheme.getMaterial(0);
    let color = new THREE.Color(this.currentTheme.previewColor);
    if (baseMat instanceof THREE.MeshStandardMaterial && baseMat.color) {
      color = baseMat.color;
    } else if (Array.isArray(baseMat) && baseMat[0] instanceof THREE.MeshStandardMaterial && baseMat[0].color) {
      color = baseMat[0].color;
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        topY: { value: height / 2 },
        bottomY: { value: -height / 2 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float topY;
        uniform float bottomY;
        varying vec3 vPosition;
        void main() {
          float alpha = smoothstep(bottomY, topY, vPosition.y);
          alpha = pow(alpha, 1.5); // non-linear fade
          gl_FragColor = vec4(color, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -height / 2 - BLOCK_HEIGHT / 2 + 0.01, 0);
    this.reflectionGroup.add(mesh);
    
    if (this.isMultiplayer) {
      const mesh2 = new THREE.Mesh(geometry, material.clone());
      mesh2.position.set(-15, -height / 2 - BLOCK_HEIGHT / 2 + 0.01, -5);
      this.reflectionGroup.add(mesh2);
    }
  }

  initGame() {
    this.stack.forEach(b => {
      this.scene.remove(b);
      b.geometry.dispose();
      if (Array.isArray(b.material)) {
        b.material.forEach(m => m.dispose());
      } else {
        b.material.dispose();
      }
    });
    this.physicsBodies.forEach(o => {
      this.scene.remove(o.mesh);
      o.mesh.geometry.dispose();
      if (Array.isArray(o.mesh.material)) {
        o.mesh.material.forEach(m => m.dispose());
      } else {
        o.mesh.material.dispose();
      }
    });
    
    // Clear physics world
    while (this.physicsWorld.bodies.length > 0) {
      this.physicsWorld.removeBody(this.physicsWorld.bodies[0]);
    }
    
    // Re-add ground
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, -BLOCK_HEIGHT / 2, 0);
    this.physicsWorld.addBody(groundBody);
    
    if (this.workingBlock) {
      this.scene.remove(this.workingBlock);
      this.workingBlock.geometry.dispose();
      if (Array.isArray(this.workingBlock.material)) {
        this.workingBlock.material.forEach(m => m.dispose());
      } else {
        this.workingBlock.material.dispose();
      }
      this.workingBlock = null;
    }
    
    // Clear height markers
    while(this.heightMarkersGroup.children.length > 0) {
        const child = this.heightMarkersGroup.children[0];
        this.heightMarkersGroup.remove(child);
        // Dispose logic if needed for sprites/lines
    }

    this.stack = [];
    this.opponentStack.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
      else mesh.material.dispose();
    });
    this.opponentStack = [];
    this.opponentScore = 0;
    if (this.isMultiplayer) {
      this.createOpponentTag();
      // Add opponent base block
      const geometry = this.currentTheme.createGeometry 
        ? this.currentTheme.createGeometry(ORIGINAL_BOX_SIZE, BLOCK_HEIGHT, ORIGINAL_BOX_SIZE) 
        : new THREE.BoxGeometry(ORIGINAL_BOX_SIZE, BLOCK_HEIGHT, ORIGINAL_BOX_SIZE);
      const material = this.currentTheme.getMaterial(0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { w: ORIGINAL_BOX_SIZE, h: BLOCK_HEIGHT, d: ORIGINAL_BOX_SIZE };
      mesh.position.set(-15, 0, -5);
      this.scene.add(mesh);
      this.opponentStack.push(mesh);
      
      // Initialize opponent working block
      if (this.opponentWorkingBlock) {
        this.scene.remove(this.opponentWorkingBlock);
        this.opponentWorkingBlock.geometry.dispose();
      }
      this.opponentAxis = 'x';
      this.opponentDirection = 1;
      this.opponentSpeed = 0.15;
      const nextMat = this.currentTheme.getMaterial(1);
      this.opponentWorkingBlock = new THREE.Mesh(geometry.clone(), nextMat);
      this.opponentWorkingBlock.castShadow = true;
      this.opponentWorkingBlock.receiveShadow = true;
      this.opponentWorkingBlock.position.set(-25, BLOCK_HEIGHT, -5);
      this.scene.add(this.opponentWorkingBlock);
    }
    
    this.physicsBodies = [];
    this.score = 0;
    this.perfectCombo = 0;
    this.maxPerfectCombo = 0;
    this.blocksPlaced = 0;
    this.callbacks.onScoreChange(0);
    this.state = 'start';
    this.speed = SPEED_INITIAL;
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    this.cameraTargetY = 0;
    this.hue = Math.random() * 360;
    
    this.currentW = ORIGINAL_BOX_SIZE;
    this.currentD = ORIGINAL_BOX_SIZE;
    
    const firstBlock = this.addBlock(0, 0, ORIGINAL_BOX_SIZE, ORIGINAL_BOX_SIZE);
    
    const staticShape = new CANNON.Box(new CANNON.Vec3(ORIGINAL_BOX_SIZE / 2, BLOCK_HEIGHT / 2, ORIGINAL_BOX_SIZE / 2));
    const staticBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0),
      shape: staticShape,
    });
    this.physicsWorld.addBody(staticBody);
    
    this.createReflection();
  }

  start() {
    this.state = 'playing';
    this.callbacks.onStateChange('playing');
    this.spawnWorkingBlock();
  }

  spawnWorkingBlock() {
    const topBlock = this.stack[this.stack.length - 1];
    
    const geometry = this.currentTheme.createGeometry 
      ? this.currentTheme.createGeometry(this.currentW, BLOCK_HEIGHT, this.currentD) 
      : new THREE.BoxGeometry(this.currentW, BLOCK_HEIGHT, this.currentD);
    const material = this.currentTheme.getMaterial(this.stack.length);
    this.workingBlock = new THREE.Mesh(geometry, material);
    this.workingBlock.userData = { w: this.currentW, h: BLOCK_HEIGHT, d: this.currentD };
    this.workingBlock.castShadow = true;
    this.workingBlock.receiveShadow = true;
    
    const y = this.stack.length * BLOCK_HEIGHT;
    
    this.axis = this.stack.length % 2 === 0 ? 'x' : 'z';
    this.direction = 1;
    
    const startPos = -7;
    
    if (this.axis === 'x') {
      this.workingBlock.position.set(startPos, y, topBlock.position.z);
    } else {
      this.workingBlock.position.set(topBlock.position.x, y, startPos);
    }
    
    this.scene.add(this.workingBlock);
  }

  placeBlock() {
    if (this.state !== 'playing' || !this.workingBlock) return;
    
    const topBlock = this.stack[this.stack.length - 1];
    
    const topPos = topBlock.position[this.axis];
    const workPos = this.workingBlock.position[this.axis];
    const size = this.axis === 'x' ? this.currentW : this.currentD;
    
    const diff = workPos - topPos;
    const absDiff = Math.abs(diff);
    
    if (absDiff > size) {
      this.playGameOverSound();
      this.score = Math.max(0, this.score - 50); // Penalty for missing completely
      this.callbacks.onScoreChange(this.score);
      this.gameOver(true);
      return;
    }
    
    let points = 10 + this.stack.length * 2;
    
    if (absDiff < TOLERANCE) {
      this.playPerfectSound();
      this.workingBlock.position[this.axis] = topPos;
      
      const staticShape = new CANNON.Box(new CANNON.Vec3(this.currentW / 2, BLOCK_HEIGHT / 2, this.currentD / 2));
      const staticBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(this.workingBlock.position.x, this.workingBlock.position.y, this.workingBlock.position.z),
        shape: staticShape,
      });
      this.physicsWorld.addBody(staticBody);
      
      this.stack.push(this.workingBlock);
      this.workingBlock = null;
      
      if (this.isMultiplayer && !this.isBotMatch && this.callbacks.onPlaceBlock) {
        this.callbacks.onPlaceBlock({
          w: this.currentW,
          d: this.currentD,
          x: topPos, // Simplified for now, ideally exact position
          z: this.stack[this.stack.length-1].position.z,
          score: this.score
        });
      }
      
      this.perfectCombo++;
      if (this.callbacks.onPerfectCombo) {
        this.callbacks.onPerfectCombo(this.perfectCombo);
      }
      if (this.perfectCombo > this.maxPerfectCombo) {
        this.maxPerfectCombo = this.perfectCombo;
      }
      this.blocksPlaced++;
      if (this.callbacks.onMissionProgress) {
        this.callbacks.onMissionProgress('blocks_total', 1);
        this.callbacks.onMissionProgress('perfect_combo', this.perfectCombo);
      }
      
      points += 10; // Bonus for perfect match
      
      this.score += points;
      this.callbacks.onScoreChange(this.score);
      if (this.callbacks.onMissionProgress) {
        this.callbacks.onMissionProgress('score_total', points);
        this.callbacks.onMissionProgress('score_single', this.score);
      }
      
      this.cameraShake = 0.6; // Strong shake for perfect match
      
      this.jellyWobble = 1.5;
      if (this.currentTheme.isJelly) {
        this.playSplashSound();
        let color = new THREE.Color(0xffffff);
        if (topBlock.material instanceof THREE.Material && (topBlock.material as any).color) {
          color = (topBlock.material as any).color;
        }
        this.spawnJellyParticles(topBlock.position.clone().setY(topBlock.position.y + BLOCK_HEIGHT/2), color);
      }
      
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const originalMat = topBlock.material;
      topBlock.material = flashMat;
      setTimeout(() => { topBlock.material = originalMat; }, 100);
      
      // New Perfect Match Effect: Shockwave + Squash
      const shockwaveGeo = new THREE.PlaneGeometry(this.currentW + 1, this.currentD + 1);
      const shockwaveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.position.copy(topBlock.position);
      shockwave.position.y += BLOCK_HEIGHT / 2;
      this.scene.add(shockwave);
      
      // Particle Burst
      const particleCount = 20;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(particleCount * 3);
      const pVel = [];
      for(let i=0; i<particleCount; i++) {
        pPos[i*3] = topBlock.position.x;
        pPos[i*3+1] = topBlock.position.y + BLOCK_HEIGHT/2;
        pPos[i*3+2] = topBlock.position.z;
        pVel.push({
          x: (Math.random() - 0.5) * 0.5,
          y: Math.random() * 0.5,
          z: (Math.random() - 0.5) * 0.5
        });
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true });
      const pMesh = new THREE.Points(pGeo, pMat);
      this.scene.add(pMesh);

      let frame = 0;
      const animatePerfect = () => {
        if (shockwave.material.opacity <= 0) {
          this.scene.remove(shockwave);
          this.scene.remove(pMesh);
          shockwaveGeo.dispose();
          shockwaveMat.dispose();
          pGeo.dispose();
          pMat.dispose();
          topBlock.scale.set(1, 1, 1);
          return;
        }
        
        // Update particles
        const positions = pGeo.attributes.position.array as Float32Array;
        for(let i=0; i<particleCount; i++) {
          positions[i*3] += pVel[i].x;
          positions[i*3+1] += pVel[i].y;
          positions[i*3+2] += pVel[i].z;
          pVel[i].y -= 0.02; // gravity
        }
        pGeo.attributes.position.needsUpdate = true;
        pMat.opacity -= 0.02;

        shockwave.scale.x += 0.1;
        shockwave.scale.y += 0.1;
        shockwave.material.opacity -= 0.05;
        
        frame++;
        if (frame < 5) {
          topBlock.scale.y = 1 - (frame * 0.1);
          topBlock.scale.x = 1 + (frame * 0.05);
          topBlock.scale.z = 1 + (frame * 0.05);
        } else if (frame < 15) {
          const back = (frame - 5);
          topBlock.scale.y = 0.5 + (back * 0.05);
          topBlock.scale.x = 1.25 - (back * 0.025);
          topBlock.scale.z = 1.25 - (back * 0.025);
        } else {
          topBlock.scale.set(1, 1, 1);
        }
        
        requestAnimationFrame(animatePerfect);
      };
      animatePerfect();
      
      this.nextTurn();
      return;
    }
    
    const overlap = size - absDiff;
    const direction = diff > 0 ? 1 : -1;
    
    const newSizeX = this.axis === 'x' ? overlap : this.currentW;
    const newSizeZ = this.axis === 'z' ? overlap : this.currentD;
    
    const newPosX = this.axis === 'x' ? topPos + (diff / 2) : this.workingBlock.position.x;
    const newPosZ = this.axis === 'z' ? topPos + (diff / 2) : this.workingBlock.position.z;
    
    const newBlock = this.addBlock(newPosX, newPosZ, newSizeX, newSizeZ);
    
    // Add physics body for the placed block to act as an obstacle for falling blocks
    const staticShape = new CANNON.Box(new CANNON.Vec3(newSizeX / 2, BLOCK_HEIGHT / 2, newSizeZ / 2));
    const staticBody = new CANNON.Body({
      mass: 0, // Static
      position: new CANNON.Vec3(newPosX, this.workingBlock.position.y, newPosZ),
      shape: staticShape,
    });
    this.physicsWorld.addBody(staticBody);
    
    const freq = this.currentTheme.baseFreq * Math.pow(1.05, this.stack.length % 12);
    const pan = Math.max(-1, Math.min(1, newPosX / 10)); // Pan based on X position
    this.playNormalSound(pan);
    
    this.cameraShake = 0.2; // Subtle shake for normal match
    
    // Normal match squash/stretch
    if (!this.currentTheme.isJelly) {
      let frame = 0;
      const animateNormal = () => {
        if (frame >= 10) {
          newBlock.scale.set(1, 1, 1);
          return;
        }
        frame++;
        if (frame < 5) {
          newBlock.scale.y = 1 - (frame * 0.04);
          newBlock.scale.x = 1 + (frame * 0.02);
          newBlock.scale.z = 1 + (frame * 0.02);
        } else {
          const back = (frame - 5);
          newBlock.scale.y = 0.8 + (back * 0.04);
          newBlock.scale.x = 1.1 - (back * 0.02);
          newBlock.scale.z = 1.1 - (back * 0.02);
        }
        requestAnimationFrame(animateNormal);
      };
      animateNormal();
    }
    
    this.jellyWobble = 0.8;
    if (this.currentTheme.isJelly) {
      this.playSplashSound();
      let color = new THREE.Color(0xffffff);
      if (newBlock.material instanceof THREE.Material && (newBlock.material as any).color) {
        color = (newBlock.material as any).color;
      }
      this.spawnJellyParticles(newBlock.position.clone().setY(newBlock.position.y + BLOCK_HEIGHT/2), color);
    }
    
    const overhangSizeX = this.axis === 'x' ? absDiff : newSizeX;
    const overhangSizeZ = this.axis === 'z' ? absDiff : newSizeZ;
    
    const overhangPosX = this.axis === 'x' ? newPosX + (overlap / 2 + overhangSizeX / 2) * direction : newPosX;
    const overhangPosZ = this.axis === 'z' ? newPosZ + (overlap / 2 + overhangSizeZ / 2) * direction : newPosZ;
    
    const overhangGeo = this.currentTheme.createGeometry 
      ? this.currentTheme.createGeometry(overhangSizeX, BLOCK_HEIGHT, overhangSizeZ) 
      : new THREE.BoxGeometry(overhangSizeX, BLOCK_HEIGHT, overhangSizeZ);
    const overhangMesh = new THREE.Mesh(overhangGeo, this.workingBlock.material);
    overhangMesh.userData = { w: overhangSizeX, h: BLOCK_HEIGHT, d: overhangSizeZ };
    overhangMesh.position.set(overhangPosX, this.workingBlock.position.y, overhangPosZ);
    overhangMesh.castShadow = true;
    overhangMesh.receiveShadow = true;
    
    this.scene.add(overhangMesh);
    const overhangBody = this.addPhysicsBody(overhangMesh, overhangSizeX, BLOCK_HEIGHT, overhangSizeZ);
    
    // Add impulse to the cut block
    if (overhangBody) {
      const impulseX = this.axis === 'x' ? direction * 5 : (Math.random() - 0.5) * 2;
      const impulseZ = this.axis === 'z' ? direction * 5 : (Math.random() - 0.5) * 2;
      overhangBody.applyImpulse(
        new CANNON.Vec3(impulseX, 2, impulseZ),
        new CANNON.Vec3(0, 0, 0)
      );
    }
    
    this.scene.remove(this.workingBlock);
    this.workingBlock.geometry.dispose();
    if (Array.isArray(this.workingBlock.material)) {
      this.workingBlock.material.forEach(m => m.dispose());
    } else {
      this.workingBlock.material.dispose();
    }
    this.workingBlock = null;
    
    this.perfectCombo = 0;
    if (this.callbacks.onPerfectCombo) {
      this.callbacks.onPerfectCombo(0);
    }
    this.blocksPlaced++;
    if (this.callbacks.onMissionProgress) {
      this.callbacks.onMissionProgress('blocks_total', 1);
    }
    
    this.currentW = newSizeX;
    this.currentD = newSizeZ;
    
    const penalty = Math.floor(absDiff * 10);
    points = Math.max(1, points - penalty);
    
    this.score += points;
    
    if (this.isMultiplayer && !this.isBotMatch && this.callbacks.onPlaceBlock) {
      this.callbacks.onPlaceBlock({
        w: this.currentW,
        d: this.currentD,
        x: newPosX,
        z: newPosZ,
        score: this.score
      });
    }
    
    this.callbacks.onScoreChange(this.score);
    if (this.callbacks.onMissionProgress) {
      this.callbacks.onMissionProgress('score_total', points);
      this.callbacks.onMissionProgress('score_single', this.score);
    }
    this.nextTurn();
  }

  nextTurn() {
    this.speed += 0.003;
    this.spawnWorkingBlock();
  }

  gameOver(missedCompletely: boolean) {
    if (this.isMultiplayer && !this.opponentIsGameOver) {
      this.state = 'spectating';
      this.playGameOverSound();
      
      // Make all stack blocks dynamic so they can be destroyed
      this.stack.forEach((mesh, index) => {
        if (index === 0) return; // Keep base block static
        
        let bodyObj = this.physicsBodies.find(p => p.mesh === mesh);
        if (!bodyObj) {
          const staticBody = this.physicsWorld.bodies.find(b => 
            Math.abs(b.position.x - mesh.position.x) < 0.01 && 
            Math.abs(b.position.y - mesh.position.y) < 0.01 && 
            Math.abs(b.position.z - mesh.position.z) < 0.01
          );
          
          if (staticBody) {
            let w, h, d;
            if ((mesh.geometry as any).parameters) {
              const params = (mesh.geometry as any).parameters;
              w = params.width;
              h = params.height;
              d = params.depth;
            } else {
              w = mesh.userData.w;
              h = mesh.userData.h;
              d = mesh.userData.d;
            }
            staticBody.mass = w * h * d;
            staticBody.type = CANNON.Body.DYNAMIC;
            staticBody.updateMassProperties();
            staticBody.wakeUp();
            this.physicsBodies.push({ mesh, body: staticBody });
          }
        }
      });
      
      if (this.isMultiplayer && !this.isBotMatch && this.callbacks.onGameOver) {
        this.callbacks.onGameOver(this.score, null, {
          maxPerfectCombo: this.maxPerfectCombo,
          blocksPlaced: this.blocksPlaced,
          opponentScore: this.opponentScore
        });
      }
      return;
    }

    this.triggerFinalGameOver(missedCompletely);
  }

  triggerFinalGameOver(missedCompletely: boolean = false) {
    this.state = 'gameover';
    
    // Make all stack blocks dynamic so they can be destroyed
    this.stack.forEach((mesh, index) => {
      if (index === 0) return; // Keep base block static
      
      let bodyObj = this.physicsBodies.find(p => p.mesh === mesh);
      if (!bodyObj) {
        // Find the static body we created for it
        const staticBody = this.physicsWorld.bodies.find(b => 
          Math.abs(b.position.x - mesh.position.x) < 0.01 && 
          Math.abs(b.position.y - mesh.position.y) < 0.01 && 
          Math.abs(b.position.z - mesh.position.z) < 0.01
        );
        
        if (staticBody) {
          let w, h, d;
          if ((mesh.geometry as any).parameters) {
            const params = (mesh.geometry as any).parameters;
            w = params.width;
            h = params.height;
            d = params.depth;
          } else {
            w = mesh.userData.w;
            h = mesh.userData.h;
            d = mesh.userData.d;
          }
          staticBody.mass = w * h * d;
          staticBody.type = CANNON.Body.DYNAMIC;
          staticBody.updateMassProperties();
          staticBody.wakeUp();
          this.physicsBodies.push({ mesh, body: staticBody });
        }
      }
    });

    // Render one last frame to ensure we capture the game over state
    // BUT before we render, let's adjust the camera to see the whole stack for the screenshot
    const originalCamY = this.camera.position.y;
    const originalTargetY = this.cameraTargetY;
    const originalLeft = this.camera.left;
    const originalRight = this.camera.right;
    const originalTop = this.camera.top;
    const originalBottom = this.camera.bottom;
    const originalCamX = this.camera.position.x;
    const originalCamZ = this.camera.position.z;

    const H = this.stack.length * BLOCK_HEIGHT;
    const targetCamY = H / 2 + 10;
    const targetLookY = H / 2;
    const targetD = Math.max(10, H * 0.6) * this.zoomMultiplier;
    const aspect = window.innerWidth / window.innerHeight;

    this.camera.position.y = targetCamY;
    this.cameraTargetY = targetLookY;
    
    // Position camera slightly to the side to see the 3D effect better
    const radius = 14.14 * this.zoomMultiplier;
    this.camera.position.x = Math.sin(this.targetCameraAngle || Math.PI/4) * radius;
    this.camera.position.z = Math.cos(this.targetCameraAngle || Math.PI/4) * radius;
    
    this.camera.lookAt(0, this.cameraTargetY, 0);
    
    this.camera.left = -targetD * aspect;
    this.camera.right = targetD * aspect;
    this.camera.top = targetD;
    this.camera.bottom = -targetD;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    
    if (this.isMultiplayer && !this.isBotMatch && this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.score, null, {
        maxPerfectCombo: this.maxPerfectCombo,
        blocksPlaced: this.blocksPlaced,
        opponentScore: this.opponentScore
      });
    } else if (this.isBotMatch && this.callbacks.onGameOver) {
       this.callbacks.onGameOver(this.score, null, {
        maxPerfectCombo: this.maxPerfectCombo,
        blocksPlaced: this.blocksPlaced,
        opponentScore: this.opponentScore
      });
    } else {
      try {
        const canvas = document.createElement('canvas');
        // Use full resolution for better quality when saving
        canvas.width = this.renderer.domElement.width;
        canvas.height = this.renderer.domElement.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
          
          // Draw a stylish overlay for text readability
          const gradient = ctx.createLinearGradient(0, 0, canvas.width * 0.5, 0);
          gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
          gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add text
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          
          const padding = canvas.width * 0.05;
          
          // "STACK" title
          ctx.font = `900 ${canvas.height * 0.08}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText('STACK', padding, padding);
          
          // Score
          ctx.font = `900 ${canvas.height * 0.15}px Inter, sans-serif`;
          ctx.fillStyle = 'white';
          ctx.fillText(`${this.score}`, padding, padding + canvas.height * 0.08);
          
          // Best Score
          const bestScore = Math.max(this.score, this.highScore);
          ctx.font = `700 ${canvas.height * 0.04}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(`BEST: ${bestScore}`, padding, padding + canvas.height * 0.25);
          
          // Stats
          ctx.font = `500 ${canvas.height * 0.03}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(`PERFECT COMBO: ${this.maxPerfectCombo}`, padding, canvas.height - padding - canvas.height * 0.04);
          ctx.fillText(`BLOCKS PLACED: ${this.blocksPlaced}`, padding, canvas.height - padding);

          const screenshot = canvas.toDataURL('image/jpeg', 0.8);
          if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(this.score, screenshot, {
              maxPerfectCombo: this.maxPerfectCombo,
              blocksPlaced: this.blocksPlaced
            });
          }
        }
      } catch (e) {
        console.error("Failed to capture screenshot", e);
      }
    }

    // Restore camera
    this.camera.position.y = originalCamY;
    this.camera.position.x = originalCamX;
    this.camera.position.z = originalCamZ;
    this.cameraTargetY = originalTargetY;
    this.camera.lookAt(0, this.cameraTargetY, 0);
    this.camera.left = originalLeft;
    this.camera.right = originalRight;
    this.camera.top = originalTop;
    this.camera.bottom = originalBottom;
    this.camera.updateProjectionMatrix();

    this.callbacks.onStateChange('gameover');
    
    if (missedCompletely && this.workingBlock) {
      this.addPhysicsBody(this.workingBlock, this.currentW, BLOCK_HEIGHT, this.currentD);
      this.workingBlock = null;
    }
  }

  addPhysicsBody(mesh: THREE.Mesh, sizeX: number, sizeY: number, sizeZ: number) {
    const shape = new CANNON.Box(new CANNON.Vec3(sizeX / 2, sizeY / 2, sizeZ / 2));
    const body = new CANNON.Body({
      mass: sizeX * sizeY * sizeZ, // mass proportional to volume
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
      shape: shape,
    });
    
    // Add collision event listener for sound
    body.addEventListener("collide", (e: any) => {
      const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
      if (Math.abs(relativeVelocity) > 1) {
        // Play soft collision sound
        if (this.audioCtx && !this.isMuted) {
          const pan = Math.max(-1, Math.min(1, body.position.x / 10));
          this.playNote(100 + Math.random() * 50, 'triangle', 0.1, 0.02 * Math.min(1, Math.abs(relativeVelocity) / 10), false, pan);
        }
      }
    });
    
    // Add a little random rotation and velocity to make it look cool
    const impulseDir = this.axis === 'x' ? this.direction : (this.axis === 'z' ? this.direction : 1);
    body.velocity.set(
      this.axis === 'x' ? impulseDir * 1.5 : (Math.random() - 0.5) * 2, 
      -1, 
      this.axis === 'z' ? impulseDir * 1.5 : (Math.random() - 0.5) * 2
    );
    body.angularVelocity.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    
    // Add collision sound
    body.addEventListener('collide', (e: any) => {
      if (this.state === 'gameover') return; // Don't play sounds if game is over to avoid noise
      const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
      if (Math.abs(relativeVelocity) > 1) {
        const pan = Math.max(-1, Math.min(1, body.position.x / 10));
        this.playNote(this.currentTheme.baseFreq * 0.5, 'triangle', 0.1, Math.min(0.05, Math.abs(relativeVelocity) * 0.01), false, pan);
      }
    });

    this.physicsWorld.addBody(body);
    this.physicsBodies.push({ mesh, body });
    
    // Limit the number of physics bodies to prevent lag
    if (this.physicsBodies.length > 100) {
      // Find the oldest dynamic body to remove
      const oldestIndex = this.physicsBodies.findIndex(b => b.body.mass > 0);
      if (oldestIndex !== -1) {
        const oldest = this.physicsBodies.splice(oldestIndex, 1)[0];
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        if (Array.isArray(oldest.mesh.material)) {
          oldest.mesh.material.forEach(m => m.dispose());
        } else {
          oldest.mesh.material.dispose();
        }
        this.physicsWorld.removeBody(oldest.body);
      }
    }
    
    return body;
  }

  loop = (time: number) => {
    this.animationFrameId = requestAnimationFrame(this.loop);
    
    if (!this.lastTime) this.lastTime = time;
    let deltaTime = time - this.lastTime;
    this.lastTime = time;
    
    // Cap deltaTime to prevent huge jumps if tab is inactive
    const dt = Math.min(deltaTime, 50) / 16.666;
    
    this.physicsWorld.step(1 / 60, deltaTime / 1000, 3);
    
    if (this.state === 'playing' && this.workingBlock) {
      const currentSpeed = this.speed;
      this.workingBlock.position[this.axis] += currentSpeed * this.direction * dt;
      
      if (this.workingBlock.position[this.axis] > 7) {
        this.direction = -1;
      } else if (this.workingBlock.position[this.axis] < -7) {
        this.direction = 1;
      }
    }
    
    if (this.state === 'playing' && this.isMultiplayer && this.opponentWorkingBlock) {
      const oppAxis = this.opponentAxis;
      this.opponentWorkingBlock.position[oppAxis] += this.opponentSpeed * this.opponentDirection * dt;
      
      if (oppAxis === 'x') {
        if (this.opponentWorkingBlock.position.x > -5) {
          this.opponentDirection = -1;
        } else if (this.opponentWorkingBlock.position.x < -25) {
          this.opponentDirection = 1;
        }
      } else {
        if (this.opponentWorkingBlock.position.z > 5) {
          this.opponentDirection = -1;
        } else if (this.opponentWorkingBlock.position.z < -15) {
          this.opponentDirection = 1;
        }
      }
    }
    
    for (let i = this.physicsBodies.length - 1; i >= 0; i--) {
      const pb = this.physicsBodies[i];
      if (pb.body.mass > 0) { // Only update dynamic bodies
        pb.mesh.position.copy(pb.body.position as any);
        pb.mesh.quaternion.copy(pb.body.quaternion as any);
        
        if (pb.mesh.position.y < -20) {
          this.scene.remove(pb.mesh);
          pb.mesh.geometry.dispose();
          if (Array.isArray(pb.mesh.material)) {
            pb.mesh.material.forEach(m => m.dispose());
          } else {
            pb.mesh.material.dispose();
          }
          this.physicsWorld.removeBody(pb.body);
          this.physicsBodies.splice(i, 1);
        }
      }
    }
    
    this.zoomMultiplier += (this.targetZoomMultiplier - this.zoomMultiplier) * 0.1 * dt;
    
    if (this.jellyWobble > 0) {
      this.jellyWobble *= Math.pow(0.85, dt); // faster decay for snappier feel
      if (this.jellyWobble < 0.001) this.jellyWobble = 0;
    }
    
    if (this.currentTheme.isJelly) {
      const t = Date.now() * 0.02;
      this.stack.forEach((block, i) => {
        const distFromTop = this.stack.length - 1 - i;
        const delay = distFromTop * 0.5;
        const localWobble = Math.max(0, this.jellyWobble - delay * 0.05);
        const scaleOffset = Math.sin(t - delay) * 0.15 * localWobble;
        block.scale.set(1 + scaleOffset, 1 - scaleOffset, 1 + scaleOffset);
      });
    } else {
      const t = Date.now() * 0.002;
      this.stack.forEach((block, i) => {
        // Add placement bounce to all themes
        const distFromTop = this.stack.length - 1 - i;
        const delay = distFromTop * 0.3;
        const localWobble = Math.max(0, this.jellyWobble - delay * 0.08);
        const bounceOffset = Math.sin(Date.now() * 0.03 - delay) * 0.05 * localWobble;
        
        // Subtle breathing effect for all themes
        const breatheOffset = Math.sin(t + i * 0.5) * 0.01;
        
        const totalOffset = bounceOffset + breatheOffset;
        block.scale.set(1 + totalOffset, 1 - bounceOffset + breatheOffset, 1 + totalOffset);
        
        // Subtle glow pulse if material has emissive
        if (block.material instanceof THREE.MeshStandardMaterial && block.material.emissiveIntensity !== undefined) {
          let baseIntensity = 0.2;
          if (this.currentTheme.id === 'neon_pulse') baseIntensity = 1.5;
          else if (this.currentTheme.id === 'lava_pulse') baseIntensity = 0.8;
          else if (this.currentTheme.id === 'neon_lines') {
            baseIntensity = 1.2;
            // Also animate the hue for neon_lines
            const hue = ((i * 15) + (t * 50)) % 360;
            block.material.emissive.setHSL(hue / 360, 1, 0.5);
          }
          else if (this.currentTheme.id === 'cyberpunk' || this.currentTheme.id === 'neon') baseIntensity = 0.8;
          
          block.material.emissiveIntensity = baseIntensity + Math.sin(t * 2 + i) * (baseIntensity * 0.2);
        }
      });
    }
    
    if (this.state === 'gameover') {
      const targetCamY = (this.stack.length * BLOCK_HEIGHT) / 2 + 10;
      const targetLookY = (this.stack.length * BLOCK_HEIGHT) / 2;
      
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05 * dt;
      this.cameraTargetY += (targetLookY - this.cameraTargetY) * 0.05 * dt;
      
      // Cinematic slow rotation around the tower, combined with manual drag
      const autoRotateSpeed = 0.0002;
      this.targetCameraAngle += autoRotateSpeed * dt * 16.66; // approx 60fps dt
      
      const radius = 14.14 * this.zoomMultiplier; // sqrt(10^2 + 10^2)
      
      this.camera.position.x = Math.sin(this.targetCameraAngle) * radius;
      this.camera.position.z = Math.cos(this.targetCameraAngle) * radius;
      
      this.camera.lookAt(0, this.cameraTargetY, 0);
      
      const targetD = Math.max(10, this.stack.length * BLOCK_HEIGHT * 0.6) * this.zoomMultiplier;
      const aspect = window.innerWidth / window.innerHeight;
      
      this.camera.left += (-targetD * aspect - this.camera.left) * 0.05 * dt;
      this.camera.right += (targetD * aspect - this.camera.right) * 0.05 * dt;
      this.camera.top += (targetD - this.camera.top) * 0.05 * dt;
      this.camera.bottom += (-targetD - this.camera.bottom) * 0.05 * dt;
      this.camera.updateProjectionMatrix();
    } else if (this.state === 'spectating') {
      const targetCamY = this.opponentStack.length * BLOCK_HEIGHT + 10;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.15 * dt;
      
      const targetLookY = this.opponentStack.length * BLOCK_HEIGHT;
      this.cameraTargetY += (targetLookY - this.cameraTargetY) * 0.15 * dt;
      
      this.camera.position.x = 15 + 10;
      this.camera.position.z = -15 + 10;
      this.camera.lookAt(15, this.cameraTargetY, -15);
      
      const d = 10 * this.zoomMultiplier;
      const aspect = window.innerWidth / window.innerHeight;
      this.camera.left += (-d * aspect - this.camera.left) * 0.15 * dt;
      this.camera.right += (d * aspect - this.camera.right) * 0.15 * dt;
      this.camera.top += (d - this.camera.top) * 0.15 * dt;
      this.camera.bottom += (-d - this.camera.bottom) * 0.15 * dt;
      this.camera.updateProjectionMatrix();
    } else {
      if (this.stack.length > 0) {
        const targetCamY = this.stack.length * BLOCK_HEIGHT + 10;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 0.15 * dt;
        
        const targetLookY = this.stack.length * BLOCK_HEIGHT;
        this.cameraTargetY += (targetLookY - this.cameraTargetY) * 0.15 * dt;
        this.camera.lookAt(0, this.cameraTargetY, 0);
        
        const d = 10 * this.zoomMultiplier;
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.left += (-d * aspect - this.camera.left) * 0.15 * dt;
        this.camera.right += (d * aspect - this.camera.right) * 0.15 * dt;
        this.camera.top += (d - this.camera.top) * 0.15 * dt;
        this.camera.bottom += (-d - this.camera.bottom) * 0.15 * dt;
        this.camera.updateProjectionMatrix();
      }
    }
    
    const dirLight = this.scene.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (dirLight) {
      dirLight.position.y = this.camera.position.y + 10;
      dirLight.target.position.y = this.cameraTargetY;
      dirLight.target.updateMatrixWorld();
      
      // Make shadow softer and smaller as stack grows
      dirLight.shadow.radius = 1 + this.stack.length * 0.3;
      dirLight.shadow.bias = -0.0005 - (this.stack.length * 0.0001);
    }
    
    if (this.stack.length > 0) {
      const topBlock = this.stack[this.stack.length - 1];
      
      // Dynamic background color based on top block
      let targetBgColor = new THREE.Color(this.currentTheme.bg[0]);
      if (topBlock.material instanceof THREE.MeshStandardMaterial && topBlock.material.color) {
        // Create a dark, cinematic version of the block's color for the background
        targetBgColor = topBlock.material.color.clone().multiplyScalar(0.15);
      } else if (Array.isArray(topBlock.material) && topBlock.material[0] instanceof THREE.MeshStandardMaterial && topBlock.material[0].color) {
        targetBgColor = topBlock.material[0].color.clone().multiplyScalar(0.15);
      }
      
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(targetBgColor, 0.02);
      }
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(targetBgColor, 0.02);
      }

      this.pointLight.position.x += (topBlock.position.x - this.pointLight.position.x) * 0.1;
      this.pointLight.position.z += (topBlock.position.z - this.pointLight.position.z) * 0.1;
      this.pointLight.position.y += (topBlock.position.y + 3 - this.pointLight.position.y) * 0.1;
      
      const targetColor = new THREE.Color(this.currentTheme.previewColor);
      this.pointLight.color.lerp(targetColor, 0.05);
      
      // Dynamic light intensity pulsing
      this.pointLight.intensity = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;
    } else {
      // Reset background if no blocks
      const targetBgColor = new THREE.Color(0x0a0a0a);
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.lerp(targetBgColor, 0.02);
      }
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerp(targetBgColor, 0.02);
      }
    }
    
    // Removed particles rotation
    
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    let shakeOffsetZ = 0;
    
    if (this.animatedInstancedMesh) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this.animatedData.length; i++) {
        const data = this.animatedData[i];
        
        data.position.add(data.velocity);
        data.rotation.x += data.rotVelocity.x;
        data.rotation.y += data.rotVelocity.y;
        data.rotation.z += data.rotVelocity.z;
        
        // Add some sway
        data.position.x += Math.sin(Date.now() * 0.001 + i) * 0.02;
        data.position.z += Math.cos(Date.now() * 0.001 + i) * 0.02;
        
        // Reset if it falls too far below camera or goes too high depending on velocity
        if (data.velocity.y < 0 && data.position.y < this.camera.position.y - 30) {
          data.position.y = this.camera.position.y + 30 + Math.random() * 20;
          data.position.x = (Math.random() - 0.5) * 40;
          data.position.z = (Math.random() - 0.5) * 40;
        } else if (data.velocity.y > 0 && data.position.y > this.camera.position.y + 30) {
          data.position.y = this.camera.position.y - 30 - Math.random() * 20;
          data.position.x = (Math.random() - 0.5) * 40;
          data.position.z = (Math.random() - 0.5) * 40;
        }
        
        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);
        dummy.scale.copy(data.scale);
        dummy.updateMatrix();
        this.animatedInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      this.animatedInstancedMesh.instanceMatrix.needsUpdate = true;
    }
    
    if (this.cameraShake > 0) {
      shakeOffsetX = (Math.random() - 0.5) * this.cameraShake;
      shakeOffsetY = (Math.random() - 0.5) * this.cameraShake;
      shakeOffsetZ = (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= 0.85;
      if (this.cameraShake < 0.01) this.cameraShake = 0;
    }
    
    const baseCamY = this.camera.position.y;
    
    // Static camera during gameplay
    if (this.state !== 'gameover' && this.state !== 'spectating') {
      if (this.isMultiplayer) {
        this.camera.position.x = 10;
        this.camera.position.y = baseCamY;
        this.camera.position.z = 10;
        this.camera.lookAt(0, this.cameraTargetY, 0);
      } else {
        this.camera.position.x = 10;
        this.camera.position.y = baseCamY;
        this.camera.position.z = 10;
        this.camera.lookAt(0, this.cameraTargetY, 0);
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}
