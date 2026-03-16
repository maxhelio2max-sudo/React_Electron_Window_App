// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Определяем режим разработки по NODE_ENV (fallback — true для удобства)
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    win.loadURL('http://localhost:5173'); // dev-сервер Vite
    // если нужно открыть DevTools — раскомментируй:
    // win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/*
  IPC handlers для сохранения/открытия JSON.
  Они вызываются из renderer через preload: window.electronAPI.invoke('save-json', data)
  и window.electronAPI.invoke('open-json').
*/

ipcMain.handle('save-json', async (event, payload) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Сохранить JSON',
      defaultPath: 'scene.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { ok: false, canceled: true };

    const dataStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, dataStr, 'utf-8');

    return { ok: true, filePath };
  } catch (err) {
    console.error('save-json error', err);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open-json', async (event) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Открыть JSON',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (canceled || !filePaths || filePaths.length === 0) return { ok: false, canceled: true };

    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    return { ok: true, filePath, data };
  } catch (err) {
    console.error('open-json error', err);
    return { ok: false, error: err.message };
  }
});
