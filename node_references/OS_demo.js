const os = require('os');
const { memoryUsage } = require('process');

//Platform
console.log(os.platform());

// CPU Arch
console.log(os.arch());

// CPU Core Info
console.log(os.cpus());

// Free Memory
console.log(os.freemem());

//Home dir
console.log(os.homedir());

//Uptime
console.log(os.uptime());