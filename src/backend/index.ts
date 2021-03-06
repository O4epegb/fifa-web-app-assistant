import { app, BrowserWindow } from 'electron';
import { client } from 'electron-connect';
import {
    registerShortcut,
    unregisterShortcut,
    unregisterAllShortcuts
} from './shortcut';
import { shortcutNames } from '../constants';

// const isProduction = process.env.NODE_ENV === 'production';
const useElectronConnect = process.env.ELECTRON_CONNECT === 'true';

function onAppStart() {
    let mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        center: true,
        title: 'Fifa Trading Assistant'
    });
    mainWindow.webContents.openDevTools();
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.loadURL(`file://${__dirname}/index.html`);

    Object.keys(shortcutNames)
        .map(name => shortcutNames[name])
        .forEach(shortcutName => {
            registerShortcut(shortcutName);
        });

    if (useElectronConnect) {
        client.create(mainWindow);
    }
}

app.on('ready', onAppStart);

app.on('will-quit', () => {
    Object.keys(shortcutNames).forEach(unregisterShortcut);
    unregisterAllShortcuts();
});
