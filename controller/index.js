const bluebird = require('bluebird');
const nconf = bluebird.promisifyAll(require('nconf'));
const serialport = bluebird.promisifyAll(require('serialport'));
const websocket = require('websocket');

nconf.argv().env().defaults({
  'robot-name': 'iRobot',
  'server-url': 'http://172.21.46.108',
  'retry-interval': 5000,
  'heartbeat-interval': 300000,
  'serial-port-prefix': '/dev/ttyUSB',
}).file('/etc/irobot-tcp.json').load();

var client;
var timeout;

function connect() {
  console.log("connect");
  client = new websocket.w3cwebsocket(nconf.get('server-url'));
  client.onopen = bluebird.coroutine(onOpen);
  client.onclose = bluebird.coroutine(onClose);
  client.onmessage = bluebird.coroutine(onMessage);
}

function send(type, data) {
  console.log("send", type, data);
  client.send(JSON.stringify({type: type, data: data}));
}

function heartbeat() {
  console.log("heartbeat", type, data);
  send('heartbeat');
}

function report(err) {
  console.log("error", err);
  send('error', {name: err.name, message: err.message, stack: err.stack});
}

function* onOpen() {
  console.log("open");
  send('robot', {name: nconf.get('robot-name')});
  timeout = setInterval(heartbeat, nconf.get('heartbeat-interval'));
}

function* onClose() {
  console.log("close");
  clearInterval(timeout);
  setTimeout(connect, nconf.get('retry-interval'));
}

function* onMessage(msg) {
  console.log("message");
  try {
    var data = JSON.parse(msg.data);
    yield* ({'set-name': setName, 'drive': driveRobot})[data.type](data.data);
  } catch (err) {
    report(err);
  }
}

function* setName(data) {
  console.log("set-name", data);
  nconf.set('robot-name', data.name);
  yield nconf.saveAsync();
  send('update', data);
}

function* searchPort() {
  console.log("search-port");
  for (var port of yield serialport.listAsync())
    if (port.comName.match(nconf.get('serial-port-prefix')))
      return port.comName;
}

function* startRobot(port) {
  console.log("start-robot", port);
  var serial = new serialport.SerialPort(port, {baudRate: 115200, bufferSize: 5}, false);
  yield serial.openAsync();
  yield serial.writeAsync(Buffer.of(0x80, 0x81, 0x0a));
  yield serial.updateAsync({baudRate: 57600});
  yield bluebird.delay(100);
  yield serial.writeAsync(Buffer.of(0x84));
  return serial;
}

function* driveRobot(data) {
  console.log("drive-robot", data);
  if (data.radius == 0)
    data.radius = 0x7FFF;
  try {
    var serial = yield* startRobot(yield* searchPort());
    var cmd = Buffer.of(0x89, 0, 0, 0, 0);
    cmd.writeInt16BE(data.velocity, 1);
    cmd.writeInt16BE(data.radius, 3);
    yield serial.writeAsync(cmd);
    send('update', data);
  } finally {
    yield serial.closeAsync();
  }
};

connect();
