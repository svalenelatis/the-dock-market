const fs = require('fs');
const path = require('path');

//Create Folder
// fs.mkdir(path.join(__dirname,'/test'),{},err => {
//     if(err) throw err;
//     console.log('Folder created...');
// });

//create and write file
// fs.writeFile(path.join(__dirname,'/test','dump.txt'),'Hewwo world \n\n\n',err => {
//     if(err) throw err;
//     console.log('File written to...');
//     //append file
//     fs.appendFile(path.join(__dirname,'/test','dump.txt'),'manymuchcasesooofofofofof',err => {
//         if(err) throw err;
//         console.log('File written to...');
//     });
// });

//Read from file
// fs.readFile(path.join(__dirname, 'test','dump.txt'),'utf8', (err,data) => {
//     if(err) throw (err);
//     console.log(data);
// });

//Rename File
// fs.rename(path.join(__dirname, 'test','dump.txt'),path.join(__dirname, 'test','newName.txt'), (err) => {
//     if(err) throw (err);
//     console.log(`File renamed`);
// });