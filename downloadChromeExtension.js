import { remote } from 'electron';
import fs from 'fs';
import { https } from 'follow-redirects';
import path from 'path';
import rimraf from 'rimraf';
import crossUnZip from 'cross-unzip';
import { spawn } from 'child_process';


let unzip = crossUnZip;
if (process.platform === 'linux') {
  unzip = (zip, target, cb) => {
    const proc = spawn('unzip', [zip, '-d', target]);
    let error = '';
    proc.stdout.on('data', () => {});
    proc.stderr.on('data', (data) => { error += data; });
    proc.on('close', (code) => {
      console.log(code);
      console.log(error);
      if (code === 0) return cb();
      if (code === 1 && fs.existsSync(path.resolve(target, 'manifest.json'))) {
        return cb();
      }
      cb(error);
    });
  };
}

const downloadChromeExtension = (chromeStoreID, forceDownload) => {
  if (!remote) {
    return Promise.reject('Chrome extensions can not be installed from the main process');
  }
  const savePath = remote.app.getPath('userData');
  const extensionsStore = path.resolve(`${savePath}/extensions`);
  if (!fs.existsSync(extensionsStore)) {
    fs.mkdirSync(extensionsStore);
  }
  const extensionFolder = path.resolve(`${extensionsStore}/${chromeStoreID}`);
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(extensionFolder) || forceDownload) {
      if (fs.existsSync(extensionFolder)) {
        rimraf.sync(extensionFolder);
      }
      const fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&x=id%3D${chromeStoreID}%26uc&prodversion=32`; // eslint-disable-line
      const download = fs.createWriteStream(path.resolve(`${extensionFolder}.crx`));
      https.get(fileURL, (response) => {
        response
          .pipe(download)
          .on('data', () => console.log('data'))
          .on('close', () => {
            console.log('Downloaded');
            unzip(path.resolve(`${extensionFolder}.crx`), extensionFolder, (err) => {
              if (err) return reject(err);
              resolve(extensionFolder);
            });
          });
      }).on('error', (err) => {
        reject(err);
      });
    } else {
      resolve(extensionFolder);
    }
  });
};


export default downloadChromeExtension;
