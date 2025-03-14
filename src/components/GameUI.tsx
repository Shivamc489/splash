import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GameUIProps {
  score: number;
  waterLevel: number;
  gameStarted: boolean;
  onStart: () => void;
}

const GameUI: React.FC<GameUIProps> = ({ 
  score, 
  waterLevel, 
  gameStarted, 
  onStart 
}) => {
  return (
    <div className={`absolute inset-0 ${gameStarted ? 'pointer-events-none' : ''}`}>
      {!gameStarted ? (
        <div className="flex items-center justify-center h-full w-full bg-black/50 pointer-events-auto">
          <Card className="w-[350px] backdrop-blur-lg bg-white/20 border-white/30 text-white">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500">
                Holi Splash!
              </h1>
              <p className="text-center">Celebrate Holi by splashing colors on NPCs!</p>
              <p className="text-center text-sm">
                Use WASD to move, mouse to aim, and click to shoot color!
              </p>
              <p className="text-center text-sm text-white/70">
                Find water tanks and hold R to refill your water gun.
              </p>
              <Button onClick={onStart} className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-purple-500 hover:to-pink-500">
                Start Game
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Score display */}
          <div className="absolute top-4 left-4 p-4 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
            <p className="text-xl font-bold text-white">Score: {score}</p>
          </div>
          
          {/* Water level */}
          <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="text-white font-medium">Water:</div>
              <div className="flex-1">
                <Progress value={waterLevel} className="h-2 bg-white/20" 
                  style={{'--progress-fill': waterLevel < 20 ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'} as React.CSSProperties} />
              </div>
              <div className="text-white font-medium w-12">{waterLevel}%</div>
            </div>
          </div>
          
          {/* Game status indicator - added to help debug */}
          <div className="absolute top-4 right-4 p-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20">
            <p className="text-sm font-medium text-white">Game Running</p>
          </div>
        </>
      )}
    </div>
  );
};

export default GameUI;
