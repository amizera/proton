import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';

// Plugin to auto-start backend server
const expressPlugin = () => {
  let backendProcess;

  return {
    name: 'express-plugin',
    configureServer(server) {
      console.log('Starting backend server...');
      // Spawn the backend process
      backendProcess = spawn('node', ['server/index.js'], { 
        stdio: 'inherit', // Show backend logs in the main console
        shell: true 
      });

      backendProcess.on('error', (err) => {
        console.error('Failed to start backend server:', err);
      });

      // Kill the backend process when Vite shuts down
      process.on('SIGTERM', () => {
        if (backendProcess) backendProcess.kill();
      });
      process.on('exit', () => {
        if (backendProcess) backendProcess.kill();
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), expressPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
  },
});