const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const simplifyComponent = require("./simplifyComponent.cjs");
const { exec } = require("child_process");

const findFppJsonFiles = async (dirname) => {
  if (!dirname.endsWith('/')) dirname = dirname + '/';

  let fppJsonFiles = [];

  const files = await fs.promises.readdir(dirname);
  for (const file of files) {
    const filePath = path.join(dirname, file);
    const stat = await fs.promises.lstat(filePath);
    
    if (stat.isDirectory()) {
      const subdirectoryFiles = await findFppJsonFiles(filePath);
      fppJsonFiles = fppJsonFiles.concat(subdirectoryFiles);
    } else {
      if (file.endsWith('fpp-ast.json')) {
        console.log(`Found fpp-ast.json file: ${filePath}`);
        fppJsonFiles.push(filePath);
      }
    }
  }

  return fppJsonFiles;
};

const runFppToJson = async (dirname) => {
  let fppFiles = [];

  const files = await fs.promises.readdir(dirname);
  for (const file of files) {
    if (file.endsWith('.fpp')) {
      fppFiles.push(path.join(dirname, file));
    }
  }

  for (const file of fppFiles) {
    console.log(`Running fpp-to-json on file: ${file}`);
    exec(`mkdir -p ${file.split('.fpp')[0]}`)
    exec(`fpp-to-json ${file} -s -d ${file.split('.fpp')[0]}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running fpp-to-json on file: ${file}`);
        console.error(error);
        return;
      }
    });
  }
}

ipcMain.handle('read-components', async (event) => {
  // const filePath = path.join(__dirname, 'src/components-json');
  // recursively read all files in the fpp folder
  const filePath = path.join(__dirname, 'fpp')
  await runFppToJson(filePath);
  const files = await findFppJsonFiles(filePath);
  const components = files.map(file => {
    return simplifyComponent(JSON.parse(fs.readFileSync(file)));
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

app.on("ready", () => {
  const mainWindow = new BrowserWindow({
    height: 1080,
    width: 1920,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, "public/index.html"));
  mainWindow.webContents.openDevTools();
});