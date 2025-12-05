/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE', // Static Rocks
  GEM = 'GEM', // Weapons/Artifacts
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN', // Idle Boars
  MISSILE = 'MISSILE', // Charging Boars
  MONSTER = 'MONSTER' // Level 3 Ghosts/Enemies
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; 
  color?: string;
  targetIndex?: number;
  points?: number; 
  hasFired?: boolean; 
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// Scoring Constants
export const INITIAL_SCORE = 300;
export const SCORE_PENALTY_BOAR = 100;
export const SCORE_PENALTY_MONSTER = 100;
export const SCORE_PENALTY_OBSTACLE = 10;

// Earthy/Nature Colors for HUNTER
export const HUNTER_COLORS = [
    '#5d4037', // Brown
    '#388e3c', // Green
    '#fbc02d', // Yellow
    '#e64a19', // Red/Orange
    '#5d4037', // Brown
    '#388e3c', // Green
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; // Lucide icon component
    oneTime?: boolean; // If true, remove from pool after buying
}