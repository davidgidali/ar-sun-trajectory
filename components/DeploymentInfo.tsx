'use client';

export default function DeploymentInfo() {
  // Get deployment info from environment variables (set at build time)
  const deploymentVersion = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 
                            process.env.NEXT_PUBLIC_BUILD_ID || 
                            'dev';
  
  const deploymentTime = process.env.NEXT_PUBLIC_BUILD_TIME || 
                        new Date().toISOString();
  
  const deploymentEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || 'development';

  // Format deployment time
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-xs font-mono z-30 pointer-events-none">
      <div className="flex flex-col gap-1">
        <div>
          <span className="text-gray-400">Version:</span>{' '}
          <span className="text-green-400">{deploymentVersion}</span>
        </div>
        <div>
          <span className="text-gray-400">Deployed:</span>{' '}
          <span className="text-blue-400">{formatTime(deploymentTime)}</span>
        </div>
        <div>
          <span className="text-gray-400">Env:</span>{' '}
          <span className="text-yellow-400">{deploymentEnv}</span>
        </div>
      </div>
    </div>
  );
}

