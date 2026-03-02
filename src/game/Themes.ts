import * as THREE from 'three';

export interface Theme {
  id: string;
  name: { en: string; pt: string };
  bg: [string, string];
  previewColor: string;
  isJelly?: boolean;
  soundType: OscillatorType;
  baseFreq: number;
  rarity: 'common' | 'epic' | 'legendary';
  price: number;
  getMaterial: (index: number) => THREE.Material | THREE.Material[];
  createGeometry?: (w: number, h: number, d: number) => THREE.BufferGeometry;
}

export function createInterlockingGeometry(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d, 3, 1, 3);
  const pos = geo.attributes.position;
  
  const pegHeight = Math.min(0.2, h * 0.2);
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    
    if (y > h * 0.4) { // Top vertices
      if (Math.abs(x) < w / 3 && Math.abs(z) < d / 3) {
        pos.setY(i, y + pegHeight);
      }
    } else if (y < -h * 0.4) { // Bottom vertices
      if (Math.abs(x) < w / 3 && Math.abs(z) < d / 3) {
        pos.setY(i, y + pegHeight); // Move up to create a hole
      }
    }
  }
  
  geo.computeVertexNormals();
  return geo;
}

export function createPillowGeometry(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d, 5, 1, 5);
  const pos = geo.attributes.position;
  
  const bulge = Math.min(0.3, h * 0.3);
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    
    if (y > h * 0.4) {
      const nx = x / (w/2);
      const nz = z / (d/2);
      const dist = Math.sqrt(nx*nx + nz*nz);
      const offset = Math.max(0, 1 - dist) * bulge;
      pos.setY(i, y + offset);
    } else if (y < -h * 0.4) {
      const nx = x / (w/2);
      const nz = z / (d/2);
      const dist = Math.sqrt(nx*nx + nz*nz);
      const offset = Math.max(0, 1 - dist) * bulge;
      pos.setY(i, y + offset);
    }
  }
  
  geo.computeVertexNormals();
  return geo;
}

export function createCrossInterlockGeometry(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d, 5, 1, 5);
  const pos = geo.attributes.position;
  
  const pegHeight = Math.min(0.2, h * 0.2);
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    
    if (y > h * 0.4) {
      if (Math.abs(x) < w/6 || Math.abs(z) < d/6) {
        pos.setY(i, y + pegHeight);
      }
    } else if (y < -h * 0.4) {
      if (Math.abs(x) < w/6 || Math.abs(z) < d/6) {
        pos.setY(i, y + pegHeight);
      }
    }
  }
  
  geo.computeVertexNormals();
  return geo;
}

export const THEMES: Theme[] = [
  {
    id: 'minimalist',
    name: { en: 'Minimalist', pt: 'Minimalista' },
    bg: ['#111111', '#222222'],
    previewColor: '#ffffff',
    soundType: 'sine',
    baseFreq: 110,
    rarity: 'common',
    price: 0,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xdddddd : 0xaaaaaa, roughness: 0.2, metalness: 0.1 })
  },
  {
    id: 'ocean',
    name: { en: 'Ocean', pt: 'Oceano' },
    bg: ['#001f3f', '#0074D9'],
    previewColor: '#0074D9',
    soundType: 'triangle',
    baseFreq: 130,
    rarity: 'common',
    price: 1000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(210, 80%, ${40 + Math.sin(i * 0.2) * 15}%)`, roughness: 0.3, metalness: 0.2 })
  },
  {
    id: 'mint',
    name: { en: 'Mint', pt: 'Menta' },
    bg: ['#E0F7FA', '#80DEEA'],
    previewColor: '#26C6DA',
    soundType: 'sine',
    baseFreq: 160,
    rarity: 'common',
    price: 1000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(180, 60%, ${60 + Math.sin(i * 0.2) * 15}%)`, roughness: 0.4, metalness: 0.1 })
  },
  {
    id: 'coral',
    name: { en: 'Coral', pt: 'Coral' },
    bg: ['#FFEBEE', '#FFCDD2'],
    previewColor: '#EF5350',
    soundType: 'triangle',
    baseFreq: 140,
    rarity: 'common',
    price: 1000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(350, 80%, ${60 + Math.sin(i * 0.2) * 15}%)`, roughness: 0.3, metalness: 0.1 })
  },
  {
    id: 'lavender',
    name: { en: 'Lavender', pt: 'Lavanda' },
    bg: ['#F3E5F5', '#E1BEE7'],
    previewColor: '#AB47BC',
    soundType: 'sine',
    baseFreq: 150,
    rarity: 'common',
    price: 1000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(290, 60%, ${60 + Math.sin(i * 0.2) * 15}%)`, roughness: 0.4, metalness: 0.1 })
  },
  {
    id: 'sunset',
    name: { en: 'Sunset', pt: 'Pôr do Sol' },
    bg: ['#FFD54F', '#FF8A65'],
    previewColor: '#FF7043',
    soundType: 'square',
    baseFreq: 120,
    rarity: 'epic',
    price: 2500,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(${20 + Math.sin(i * 0.1) * 20}, 90%, 60%)`, roughness: 0.2, metalness: 0.3 })
  },
  {
    id: 'midnight',
    name: { en: 'Midnight', pt: 'Meia-noite' },
    bg: ['#0A0A1A', '#1A1A2E'],
    previewColor: '#3949AB',
    soundType: 'sawtooth',
    baseFreq: 90,
    rarity: 'epic',
    price: 2500,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(230, 60%, ${20 + Math.sin(i * 0.2) * 10}%)`, roughness: 0.2, metalness: 0.6 })
  },
  {
    id: 'rosegold',
    name: { en: 'Rose Gold', pt: 'Ouro Rosa' },
    bg: ['#FCE4EC', '#F8BBD0'],
    previewColor: '#F06292',
    soundType: 'triangle',
    baseFreq: 180,
    rarity: 'epic',
    price: 3000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: 0xF8BBD0, roughness: 0.2, metalness: 0.8 })
  },
  {
    id: 'matcha',
    name: { en: 'Matcha', pt: 'Matcha' },
    bg: ['#E8F5E9', '#C8E6C9'],
    previewColor: '#66BB6A',
    soundType: 'sine',
    baseFreq: 145,
    rarity: 'common',
    price: 1000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ color: `hsl(130, 40%, ${50 + Math.sin(i * 0.2) * 15}%)`, roughness: 0.5, metalness: 0.1 })
  },
  {
    id: 'ice',
    name: { en: 'Ice', pt: 'Gelo' },
    bg: ['#E3F2FD', '#BBDEFB'],
    previewColor: '#42A5F5',
    soundType: 'sine',
    baseFreq: 200,
    rarity: 'legendary',
    price: 5000,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ color: 0xBBDEFB, transmission: 0.9, opacity: 1, metalness: 0.1, roughness: 0.05, ior: 1.3, thickness: 2.0, transparent: true })
  },
  {
    id: 'gold',
    name: { en: 'Gold', pt: 'Ouro' },
    bg: ['#2A2000', '#1A1400'], // Darker background to make gold pop
    previewColor: '#FFD700',
    soundType: 'square',
    baseFreq: 110,
    rarity: 'legendary',
    price: 6000,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ 
      color: 0xFFD700, 
      metalness: 1.0, 
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.0
    })
  },
  {
    id: 'ruby',
    name: { en: 'Ruby', pt: 'Rubi' },
    bg: ['#FFEBEE', '#FFCDD2'],
    previewColor: '#E53935',
    soundType: 'sawtooth',
    baseFreq: 130,
    rarity: 'legendary',
    price: 6000,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ color: 0xE53935, transmission: 0.8, opacity: 1, metalness: 0.2, roughness: 0.1, ior: 1.5, thickness: 3.0, transparent: true })
  },
  {
    id: 'sapphire',
    name: { en: 'Sapphire', pt: 'Safira' },
    bg: ['#E3F2FD', '#90CAF9'],
    previewColor: '#1E88E5',
    soundType: 'sawtooth',
    baseFreq: 140,
    rarity: 'legendary',
    price: 6000,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ color: 0x1E88E5, transmission: 0.8, opacity: 1, metalness: 0.2, roughness: 0.1, ior: 1.5, thickness: 3.0, transparent: true })
  },
  {
    id: 'amethyst',
    name: { en: 'Amethyst', pt: 'Ametista' },
    bg: ['#F3E5F5', '#CE93D8'],
    previewColor: '#8E24AA',
    soundType: 'sawtooth',
    baseFreq: 150,
    rarity: 'legendary',
    price: 6000,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ color: 0x8E24AA, transmission: 0.8, opacity: 1, metalness: 0.2, roughness: 0.1, ior: 1.5, thickness: 3.0, transparent: true })
  },
  {
    id: 'neon_pulse',
    name: { en: 'Neon Pulse', pt: 'Pulso Neon' },
    bg: ['#050010', '#000000'],
    previewColor: '#FF00FF',
    soundType: 'sawtooth',
    baseFreq: 140,
    rarity: 'legendary',
    price: 8000,
    getMaterial: (i) => {
      const hue = (i * 15) % 360;
      return new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        emissive: new THREE.Color(`hsl(${hue}, 100%, 50%)`), 
        emissiveIntensity: 1.5 + Math.sin(i * 0.5) * 0.5, // Pulsing effect
        roughness: 0.1, 
        metalness: 0.8 
      });
    }
  },
  {
    id: 'monochrome',
    name: { en: 'Monochrome', pt: 'Monocromático' },
    bg: ['#FFFFFF', '#F0F0F0'], // All white background
    previewColor: '#000000',
    soundType: 'sine',
    baseFreq: 100,
    rarity: 'epic',
    price: 3500,
    getMaterial: () => new THREE.MeshPhysicalMaterial({ 
      color: 0x111111, // Black cubes
      roughness: 0.1, 
      metalness: 0.2,
      clearcoat: 0.5
    })
  },
  {
    id: 'lava_pulse',
    name: { en: 'Lava', pt: 'Lava' },
    bg: ['#1A0500', '#000000'],
    previewColor: '#FF3300',
    soundType: 'square',
    baseFreq: 65,
    rarity: 'epic',
    price: 4000,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ 
      color: 0x220000, 
      emissive: 0xFF3300, 
      emissiveIntensity: 0.8, 
      roughness: 0.9, 
      metalness: 0.1 
    })
  },
  {
    id: 'neon_lines',
    name: { en: 'Neon Lines', pt: 'Linhas Neon' },
    bg: ['#000000', '#050510'],
    previewColor: '#00FFFF',
    soundType: 'sawtooth',
    baseFreq: 160,
    rarity: 'legendary',
    price: 8500,
    getMaterial: (i) => {
      const hue = (i * 15) % 360;
      return new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        emissive: new THREE.Color(`hsl(${hue}, 100%, 50%)`), 
        emissiveIntensity: 1.0, 
        roughness: 0.1, 
        metalness: 0.9,
        wireframe: true,
        wireframeLinewidth: 2
      });
    }
  },
  {
    id: 'lego',
    name: { en: 'Lego', pt: 'Lego' },
    bg: ['#E3F2FD', '#90CAF9'],
    previewColor: '#F44336',
    soundType: 'square',
    baseFreq: 150,
    rarity: 'epic',
    price: 4500,
    getMaterial: (i) => {
      const colors = [0xF44336, 0x2196F3, 0xFFEB3B, 0x4CAF50];
      return new THREE.MeshStandardMaterial({ 
        color: colors[i % colors.length], 
        roughness: 0.2, 
        metalness: 0.1,
        clearcoat: 0.5
      });
    },
    createGeometry: createInterlockingGeometry
  },
  {
    id: 'puzzle',
    name: { en: 'Puzzle', pt: 'Quebra-cabeça' },
    bg: ['#FFF3E0', '#FFCC80'],
    previewColor: '#FF9800',
    soundType: 'triangle',
    baseFreq: 120,
    rarity: 'epic',
    price: 4500,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ 
      color: `hsl(${30 + Math.sin(i * 0.5) * 20}, 80%, 60%)`, 
      roughness: 0.6, 
      metalness: 0.1 
    }),
    createGeometry: createCrossInterlockGeometry
  },
  {
    id: 'pillow',
    name: { en: 'Pillow', pt: 'Almofada' },
    bg: ['#FCE4EC', '#F48FB1'],
    previewColor: '#E91E63',
    soundType: 'sine',
    baseFreq: 180,
    rarity: 'epic',
    price: 4500,
    isJelly: true,
    getMaterial: (i) => new THREE.MeshStandardMaterial({ 
      color: `hsl(330, 70%, ${60 + Math.sin(i * 0.3) * 20}%)`, 
      roughness: 0.8, 
      metalness: 0.0 
    }),
    createGeometry: createPillowGeometry
  },
];
