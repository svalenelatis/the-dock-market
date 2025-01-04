const http = require('http');

//Making a server object
http.createServer((req,res) => {
    //writing a response to req
    res.write('Hewwo World');
    res.end();
}).listen(5000, () => console.log('Server Online at Port 5000'));