const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Menu, Tray, nativeImage, shell, session } = require('electron');

const APP_URL =
  process.env.LINKBOARD_APP_URL ||
  'https://linkboard-m5wi.vercel.app/dashboard.html?v=desktop';
const SESSION_PARTITION = 'persist:linkboard-desktop';

let mainWindow = null;
let tray = null;
let isQuitting = false;

function configureAppDataPaths() {
  const basePath = path.join(app.getPath('appData'), 'LinkboardDesktop');
  const sessionPath = path.join(basePath, 'session-data');

  fs.mkdirSync(basePath, { recursive: true });
  fs.mkdirSync(sessionPath, { recursive: true });

  app.setPath('userData', basePath);
  app.setPath('sessionData', sessionPath);
}

function configurePermissions() {
  const desktopSession = session.fromPartition(SESSION_PARTITION);
  const isTrustedOrigin = (origin) =>
    origin === 'https://linkboard-m5wi.vercel.app' ||
    origin === 'https://linkboard-m5wi.vercel.app:443';

  const allowPermission = (_wc, permission, requestingOrigin, details, callback) => {
    if (
      (permission === 'notifications' || permission === 'persistent-storage') &&
      isTrustedOrigin((details && details.requestingOrigin) || requestingOrigin)
    ) {
      if (typeof callback === 'function') callback(true);
      return true;
    }

    if (typeof callback === 'function') callback(false);
    return false;
  };

  desktopSession.setPermissionCheckHandler((wc, permission, requestingOrigin, details) =>
    allowPermission(wc, permission, requestingOrigin, details)
  );

  desktopSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    allowPermission(wc, permission, '', details, callback);
  });
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('Linkboard');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Linkboard',
        click: () => {
          if (!mainWindow) {
            createWindow();
            return;
          }

          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: 'Open in Browser',
        click: () => {
          shell.openExternal(APP_URL);
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );

  tray.on('double-click', () => {
    if (!mainWindow) {
      createWindow();
      return;
    }

    mainWindow.show();
    mainWindow.focus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1160,
    minHeight: 760,
    title: 'Linkboard',
    autoHideMenuBar: true,
    backgroundColor: '#1b1f24',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: SESSION_PARTITION,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  configurePermissions();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }

    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

configureAppDataPaths();
