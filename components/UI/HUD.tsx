/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, MapPin, Feather, Rocket, ArrowUpCircle, Shield, Activity, PlusCircle, Play, ArrowLeft, ArrowRight, Sun } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, HUNTER_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// Virtual Controls Component
const VirtualControls: React.FC = () => {
    const { hasImmortality } = useStore();

    const triggerKey = (key: string) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-[60]">
            {/* Bottom Left: Movement */}
            <div className="absolute bottom-6 left-6 flex space-x-4 pointer-events-auto">
                <button 
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:bg-white/40 active:scale-95 transition-all"
                    onPointerDown={() => triggerKey('ArrowLeft')}
                >
                    <ArrowLeft className="w-8 h-8 text-white" />
                </button>
                <button 
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:bg-white/40 active:scale-95 transition-all"
                    onPointerDown={() => triggerKey('ArrowRight')}
                >
                    <ArrowRight className="w-8 h-8 text-white" />
                </button>
            </div>

            {/* Bottom Right: Actions */}
            <div className="absolute bottom-6 right-6 flex flex-col space-y-4 pointer-events-auto items-center">
                 {hasImmortality && (
                     <button 
                        className="w-12 h-12 rounded-full bg-yellow-500/50 backdrop-blur-md border-2 border-yellow-300 flex items-center justify-center active:bg-yellow-500/80 active:scale-95 transition-all mb-2"
                        onPointerDown={() => triggerKey('Enter')}
                    >
                        <Shield className="w-6 h-6 text-white" />
                    </button>
                 )}
                <button 
                    className="w-20 h-20 rounded-full bg-orange-600/50 backdrop-blur-md border-4 border-orange-400 flex items-center justify-center active:bg-orange-600/80 active:scale-95 transition-all"
                    onPointerDown={() => triggerKey('ArrowUp')}
                >
                    <ArrowUpCircle className="w-10 h-10 text-white" />
                </button>
            </div>
        </div>
    );
};

const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'DOUBLE LEAP',
        description: 'Jump again in mid-air to reach higher spirits.',
        cost: 1000,
        icon: ArrowUpCircle,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'ANCESTRAL VITALITY',
        description: 'Permanently adds a heart slot and heals you.',
        cost: 1500,
        icon: Activity
    },
    {
        id: 'HEAL',
        name: 'HERBAL REMEDY',
        description: 'Restores 1 Life point instantly.',
        cost: 1000,
        icon: PlusCircle
    },
    {
        id: 'IMMORTAL',
        name: 'SPIRIT SHIELD',
        description: 'Unlock Ability: Become invincible for 5s.',
        cost: 3000,
        icon: Shield,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });

        pool = pool.sort(() => 0.5 - Math.random());
        setItems(pool.slice(0, 3));
    }, []);

    return (
        <div className="absolute inset-0 bg-[#2d1b0e]/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-3xl md:text-5xl font-black text-orange-400 mb-2 font-serif tracking-widest text-center">VILLAGE TRADER</h2>
                 <div className="flex items-center text-yellow-200 mb-6 md:mb-8">
                     <span className="text-base md:text-lg mr-2">SPIRITS COLLECTED:</span>
                     <span className="text-xl md:text-2xl font-bold">{score.toLocaleString()}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-[#3e2723]/80 border border-[#5d4037] p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-orange-500 transition-colors shadow-lg">
                                 <div className="bg-[#5d4037] p-3 md:p-4 rounded-full mb-3 md:mb-4">
                                     <Icon className="w-6 h-6 md:w-8 md:h-8 text-orange-200" />
                                 </div>
                                 <h3 className="text-lg md:text-xl font-bold mb-2 text-orange-100">{item.name}</h3>
                                 <p className="text-orange-200/70 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-4 md:px-6 py-2 rounded font-bold w-full text-sm md:text-base ${canAfford ? 'bg-[#ff6f00] hover:bg-[#ff8f00] text-white' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}
                                 >
                                     {item.cost} SPIRITS
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-8 md:px-10 py-3 md:py-4 bg-[#1b5e20] text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-lg border border-[#2e7d32]"
                 >
                     CONTINUE HUNT <Play className="ml-2 w-5 h-5" fill="white" />
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, level, restartGame, startGame, gemsCollected, distance, isImmortalityActive, speed } = useStore();
  const target = ['H', 'U', 'N', 'T', 'E', 'R'];

  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50";

  if (status === GameStatus.SHOP) {
      return <ShopScreen />;
  }

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-[#1b1b1b]/90 backdrop-blur-sm p-4 pointer-events-auto">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-orange-900/50">
                <div className="relative w-full bg-[#2d1b0e] h-[500px] flex flex-col items-center justify-center text-center p-6">
                     
                     <div className="mb-6">
                        <Sun className="w-20 h-20 text-orange-500 animate-spin-slow mx-auto" />
                     </div>

                     <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-yellow-600 mb-2 font-serif">
                        INDI-HUNTER
                     </h1>
                     <p className="text-orange-200/80 mb-8 font-mono tracking-widest text-sm">
                         ANCESTRAL RUN
                     </p>
                     
                     <button 
                          onClick={() => { audio.init(); startGame(); }}
                          className="w-full px-6 py-4 bg-[#e65100] text-white font-black text-xl rounded-xl hover:bg-[#ef6c00] transition-all shadow-[0_4px_0_#bf360c] active:shadow-none active:translate-y-[4px]"
                        >
                            BEGIN HUNT
                        </button>
                        
                        <p className="text-orange-200/40 text-[10px] md:text-xs font-mono mt-6 tracking-wider">
                            START WITH 300 POINTS.
                        </p>
                        <p className="text-orange-200/40 text-[10px] md:text-xs font-mono tracking-wider">
                            DODGE BOARS & MONSTERS (-100).
                        </p>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <h1 className="text-4xl md:text-6xl font-black text-red-500 mb-6 font-serif text-center">HUNT ENDED</h1>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-[#3e2723]/80 p-3 md:p-4 rounded-lg border border-[#5d4037] flex items-center justify-between">
                        <div className="flex items-center text-yellow-400 text-sm md:text-base"><Trophy className="mr-2 w-4 h-4 md:w-5 md:h-5"/> AREA</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{level} / 3</div>
                    </div>
                    <div className="bg-[#3e2723]/80 p-3 md:p-4 rounded-lg border border-[#5d4037] flex items-center justify-between">
                        <div className="flex items-center text-cyan-400 text-sm md:text-base"><Feather className="mr-2 w-4 h-4 md:w-5 md:h-5"/> WEAPONS</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{gemsCollected}</div>
                    </div>
                    <div className="bg-[#3e2723]/80 p-3 md:p-4 rounded-lg border border-[#5d4037] flex items-center justify-between">
                        <div className="flex items-center text-orange-400 text-sm md:text-base"><MapPin className="mr-2 w-4 h-4 md:w-5 md:h-5"/> DISTANCE</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{Math.floor(distance)} m</div>
                    </div>
                     <div className="bg-[#2d1b0e]/80 p-3 md:p-4 rounded-lg flex items-center justify-between mt-2">
                        <div className="flex items-center text-white text-sm md:text-base">TOTAL SCORE</div>
                        <div className="text-2xl md:text-3xl font-bold text-yellow-500">{score.toLocaleString()}</div>
                    </div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-10 py-3 md:py-4 bg-[#e65100] text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-lg border border-[#ff6f00]"
                >
                    HUNT AGAIN
                </button>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b5e20] to-black z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Sun className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mb-4 animate-bounce" />
                <h1 className="text-3xl md:text-6xl font-black text-yellow-400 mb-2 font-serif text-center leading-tight">
                    LEGENDARY HUNTER
                </h1>
                <p className="text-green-200 text-sm md:text-2xl font-mono mb-8 tracking-widest text-center">
                    THE ANCESTORS ARE PROUD
                </p>
                
                <div className="grid grid-cols-1 gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-black/30 p-6 rounded-xl border border-yellow-500/30">
                        <div className="text-xs md:text-sm text-gray-300 mb-1 tracking-wider">FINAL SCORE</div>
                        <div className="text-3xl md:text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
                    </div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black text-lg md:text-xl rounded hover:scale-105 transition-all tracking-widest"
                >
                    START NEW JOURNEY
                </button>
            </div>
        </div>
    );
  }

  return (
    <>
        <div className={containerClass}>
            {/* Top Bar */}
            <div className="flex justify-between items-start w-full">
                {/* Score (Left) */}
                <div className="flex flex-col">
                    <div className="text-3xl md:text-5xl font-bold text-orange-400 drop-shadow-md font-serif">
                        {score.toLocaleString()}
                    </div>
                </div>
                
                {/* Right Side: Lives & Progress Bar */}
                <div className="flex flex-col items-end">
                    {/* Lives */}
                    <div className="flex space-x-1 mb-2">
                        {[...Array(maxLives)].map((_, i) => (
                            <Heart 
                                key={i} 
                                className={`w-6 h-6 md:w-8 md:h-8 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-800 fill-gray-800'} drop-shadow-sm`} 
                            />
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32 md:w-48 h-3 bg-gray-900/80 rounded-full border border-gray-600 overflow-hidden relative shadow-lg">
                        <div 
                            className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 transition-all duration-500 ease-out"
                            style={{ width: `${(collectedLetters.length / 6) * 100}%` }}
                        />
                        {/* Segments for letters */}
                        <div className="absolute inset-0 flex">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex-1 border-r border-gray-800/30 last:border-r-0"></div>
                            ))}
                        </div>
                    </div>
                    <div className="text-[10px] md:text-xs text-orange-200/60 font-mono mt-1 tracking-widest">
                        SPIRIT PROGRESS
                    </div>
                </div>
            </div>
            
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-sm md:text-lg text-yellow-100 font-bold tracking-wider font-mono bg-black/30 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm z-50">
                ZONE {level} <span className="text-gray-400 text-xs md:text-sm">/ 3</span>
            </div>

            {isImmortalityActive && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-yellow-300 font-bold text-xl md:text-2xl animate-pulse flex items-center drop-shadow-md">
                    <Shield className="mr-2 fill-yellow-400" /> SPIRIT SHIELD
                </div>
            )}

            {/* Collection Status (Center) */}
            <div className="absolute top-16 md:top-24 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
                {target.map((char, idx) => {
                    const isCollected = collectedLetters.includes(idx);
                    const color = HUNTER_COLORS[idx];

                    return (
                        <div 
                            key={idx}
                            style={{
                                borderColor: isCollected ? color : 'rgba(80, 60, 50, 0.5)',
                                color: isCollected ? '#2d1b0e' : 'rgba(100, 80, 70, 0.8)',
                                backgroundColor: isCollected ? color : 'rgba(30, 20, 10, 0.6)'
                            }}
                            className={`w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 font-black text-lg md:text-xl font-serif rounded-sm transform transition-all duration-300`}
                        >
                            {char}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Overlay Info */}
            <div className="w-full flex justify-end items-end mb-24 pointer-events-none">
                <div className="flex items-center space-x-2 text-orange-300 opacity-80">
                    <Zap className="w-4 h-4 md:w-6 md:h-6" />
                    <span className="font-mono text-base md:text-xl">PACE {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
                </div>
            </div>
        </div>
        
        {/* Virtual Controls Overlay */}
        <VirtualControls />
    </>
  );
};