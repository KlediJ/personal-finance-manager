import React, { useState, useEffect } from 'react';

// Styles for the environment indicator
const styles = {
  dev: {
    position: 'fixed' as 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#f44336',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 9999,
    opacity: 0.8,
    cursor: 'pointer'
  },
  prod: {
    position: 'fixed' as 'fixed',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 9999,
    opacity: 0.8,
    cursor: 'pointer'
  },
  tooltip: {
    position: 'absolute' as 'absolute',
    bottom: '30px',
    right: '0',
    backgroundColor: '#333',
    color: 'white',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '12px',
    width: '220px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  }
};

interface EnvironmentInfo {
  environment: string;
  dbPath: string;
  version: string;
  appPath: string;
  userData: string;
}

const EnvironmentIndicator: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Get environment information from the main process
    const electronAPI = (window as any).electron;
    if (electronAPI && electronAPI.getEnvironment) {
      electronAPI.getEnvironment()
        .then((info: EnvironmentInfo) => {
          setEnvInfo(info);
        })
        .catch((error: any) => {
          console.error('Error getting environment info:', error);
        });
    }
  }, []);

  if (!envInfo) {
    return null;
  }

  const style = envInfo.environment === 'development' ? styles.dev : styles.prod;

  return (
    <div 
      style={style}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      {envInfo.environment.toUpperCase()} MODE
      
      {showTooltip && (
        <div style={styles.tooltip}>
          <div><strong>Environment:</strong> {envInfo.environment}</div>
          <div><strong>Version:</strong> {envInfo.version}</div>
          <div><strong>Database:</strong> {envInfo.dbPath}</div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentIndicator;
