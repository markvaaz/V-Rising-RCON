import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { RconClient } from './rcon.js';

const APP_CONFIG = {
  window: {
    width: 1100,
    height: 750,
    darkTheme: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  },
  devTools: false,
  menuVisible: false
};

let mainWindow: BrowserWindow | null = null;
let rconClient: RconClient | null = null;

const currentDir = dirname(fileURLToPath(import.meta.url));

function createMainWindow() {
  mainWindow = new BrowserWindow({
    ...APP_CONFIG.window,
    webPreferences: {
      ...APP_CONFIG.window.webPreferences,
      preload: join(currentDir, 'preload.js')
    }
  });

  configureMainWindow(mainWindow);
}

function configureMainWindow(window: BrowserWindow) {
  if (APP_CONFIG.devTools) {
    window.webContents.openDevTools();
  }

  if (!APP_CONFIG.menuVisible) {
    window.setMenu(null);
  }

  window.loadFile(join(currentDir, '../public/index.html'));

  window.on('closed', () => {
    mainWindow = null;
  });
}

function setupAppHandlers() {
  app.whenReady().then(createMainWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

function setupRconHandlers() {
  ipcMain.handle('rcon-connect', handleRconConnect);
  ipcMain.handle('rcon-command', handleRconCommand);
  ipcMain.handle('rcon-disconnect', handleRconDisconnect);
}

async function handleRconConnect(event: Electron.IpcMainInvokeEvent, host: string, port: number, password: string) {
  rconClient = new RconClient(host, port, password);

  rconClient.ondisconnect = () => {
    mainWindow?.webContents.send('rcon-disconnected');
  };

  try {
    await rconClient.connect();
    return { success: true };
  } catch (error) {
    rconClient = null;
    return { success: false, message: (error as Error).message };
  }
}

async function handleRconCommand(event: Electron.IpcMainInvokeEvent, command: string) {
  if (!rconClient) {
    return { success: false, message: 'Not connected' };
  }

  try {
    const response = await rconClient.sendCommand(command);
    return { success: true, response };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

async function handleRconDisconnect(event: Electron.IpcMainInvokeEvent) {
  if (!rconClient) {
    return { success: false, message: 'Not connected' };
  }

  rconClient.disconnect();
  rconClient = null;
  return { success: true };
}

function initializeApp() {
  setupAppHandlers();
  setupRconHandlers();
}

initializeApp();