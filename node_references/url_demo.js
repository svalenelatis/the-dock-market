const url = require('url');

const myUrl = new URL('http://mywebsite.com/hello.html?id=100&status=active');

//Serialized URL
console.log(myUrl.href);
console.log(myUrl.toString());

// Host (root domain)
console.log(myUrl.host);

//Hostname (no port)
console.log(myUrl.hostname);

//Pathname
console.log(myUrl.pathname);

//Serialized Query
console.log(myUrl.search);

//Parameter/Query Object
console.log(myUrl.searchParams);

//Add param
myUrl.searchParams.append('refresh','5');
console.log(myUrl.searchParams);

//Loop through params
myUrl.searchParams.forEach((value,name) => console.log(`${name}: ${value}`));