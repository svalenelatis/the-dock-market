const EventEmitter = require(`events`);

// Create class
class MyEmitter extends EventEmitter { }

//Initialize an Emitter
const emitter = new MyEmitter();

//Event Listener
emitter.on('event', () => console.log('Event Fired!! Wowowowowow'));

//Initialize Event
emitter.emit('event');