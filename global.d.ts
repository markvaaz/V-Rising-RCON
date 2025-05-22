export { };

declare global {
  interface Window {
    electronAPI: {
      rconConnect: (host: string, port: number, password: string) => Promise<{ success: boolean; message?: string }>;
      rconCommand: (command: string) => Promise<{ success: boolean; response?: string; message?: string }>;
      rconDisconnect: () => Promise<{ success: boolean; message?: string }>;
      onRconDisconnected(callback: () => void): void;
    };
  }
}