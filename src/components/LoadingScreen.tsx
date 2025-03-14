
import React from 'react';
import { Progress } from '@/components/ui/progress';

const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
      <div className="w-64 text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Holi Splash!</h1>
        <div className="animate-bounce mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-300 via-red-500 to-pink-500 opacity-90"></div>
        </div>
        <p className="text-white mb-4">Loading your colorful experience...</p>
        <Progress value={progress} className="h-2 bg-white/20" />
      </div>
    </div>
  );
};

export default LoadingScreen;
