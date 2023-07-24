const { exec } = require("child_process");
const fs = require('fs');
const path = require('path');

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

module.exports = { findFppJsonFiles, runFppToJson };