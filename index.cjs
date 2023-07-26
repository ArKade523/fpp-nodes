const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const simplifyComponent = require("./utils/simplifyComponent.cjs");
const { findFppJsonFiles, runFppToJson } = require("./utils/handleFppFiles.cjs");
const getFiles = require("./utils/getFiles.cjs");
const { template, aboutOptions } = require("./utils/menuOptions.cjs");

ipcMain.handle('read-components', async (event) => {
  // const filePath = path.join(__dirname, 'src/components-json');
  // recursively read all files in the fpp folder
  const filePath = path.join(__dirname, 'fpp')
  let components = [];
  await runFppToJson(filePath).then(async () => {
    const files = await findFppJsonFiles(filePath);
    components = files.map(file => {
      return simplifyComponent(file);
    });
  });

  return components;
});

ipcMain.handle('write-component', (event, component) => {
  const filePath = path.join(__dirname, 'src/components-json', `${component.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(component, null, 2));
});

ipcMain.handle('watch-component-dir', (event) => {
  const filePath = path.join(__dirname, 'src/components-json');
  
  fs.watch(filePath, (eventType, filename) => {
    event.reply('component-dir-changed', eventType, filename);
  });
});

ipcMain.on('get-file-list', (event, directoryPath) => {
  try {
    const filesObject = getFiles(directoryPath);
    event.reply('file-list', filesObject);
  } catch (err) {
    console.log('Unable to scan directory: ' + err);
  }
});

ipcMain.on('read-file', (event, path) => {
  fs.readFile(path, 'utf-8', (err, data) => {
    if(err) {
      console.log('An error occurred while reading the file:\n', err);
      event.sender.send('file-data', '');
      return;
    }

    event.sender.send('file-data', data);
  });
});

ipcMain.on('write-file', (event, path, data) => {
  fs.writeFile(path, data, 'utf-8', (err) => {
    if(err) {
      console.log('An error occurred while writing the file:', err);
    }
  });
});

ipcMain.on('create-new-file', (event, path, fileName) => {
  fs.writeFile(`${path}/${fileName}`, '', function (err) {
      if (err) throw err;
      console.log('File is created successfully.');
      const filesObject = getFiles(path);
      event.sender.send('file-list', filesObject);
  }); 
});

ipcMain.on('create-new-folder', (event, path, fileName) => {
  fs.mkdir(`${path}/${fileName}`, { recursive: true }, (err) => {
      if (err) throw err;
      console.log('Folder is created successfully.');
      const filesObject = getFiles(path);
      event.sender.send('file-list', filesObject);
  });
});

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    height: 1080,
    width: 1920,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  app.setAboutPanelOptions(aboutOptions);

  mainWindow.loadFile(path.join(__dirname, "public/index.html"));
  mainWindow.webContents.openDevTools();
});