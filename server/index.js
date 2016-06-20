const http = require('http');
const uuid = require('uuid');
const websocket = require('websocket');

var httpServer = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end();
});

var socketServer = new websocket.server({
  autoAcceptConnections: true,
  httpServer: httpServer,
});

var clients = {};
var robots = {};

socketServer.on('connect', function(sock) {
  console.log("connect", sock.remoteAddress);

  var id = uuid.v4();
  var props = {ip: sock.remoteAddress};
  var methods;

  function update(data) {
    console.log(id, "update", data);
    for (var key in data)
      props[key] = data[key];
  }

  function send(type, data) {
    console.log(id, "send", type, data);
    sock.send(JSON.stringify({type: type, data: data}));
  }

  function sendTo(channel, type, data) {
    console.log(id, "send-clients", type, data);
    for (var cid in channel)
      channel[cid].send(type, data);
  }

  function report(rid, err) {
    console.log(id, "report", rid, err);
    send('error', {[rid]: {name: err.name, message: err.message}});
  }

  function reportTo(channel, rid, err) {
    console.log(id, "report-clients", rid, err);
    for (var cid in channel)
      channel[cid].report(rid, err);
  }

  function robotsProperties() {
    var rprops = {};
    for (var rid in robots)
      rprops[rid] = robots[rid].props;
    return rprops;
  }

  function join(channel, chmethods) {
    console.log(id, "join", Object.keys(chmethods));
    channel[id] = {props: props, send: send, report: report};
    sock.once('close', function() {
      delete channel[id];
    });
    methods = chmethods;
  }

  function makeRobot(data) {
    console.log(id, "robot", data);
    join(robots, {update: robotUpdateProperties, error: robotReportError});
    update(data);
    sendTo(clients, 'connect', {[id]: props})
    sock.once('close', function(code, message) {
      sendTo(clients, 'disconnect', {[id]: {code: code, message: message}})
    });
  }

  function makeClient(data) {
    console.log(id, "client", data);
    join(clients, {set: clientSet});
    send('connect', robotsProperties());
  }

  function robotUpdateProperties(data) {
    console.log(id, "robot-update", data);
    update(data);
    sendTo(clients, 'update', {[id]: data});
  }

  function robotReportError(data) {
    console.log(id, "robot-error", data);
    reportTo(clients, id, data);
  }

  function clientSet(data) {
    console.log(id, "client-set", data);
    for (var rid in data)
      robots[rid].send('set', data[rid]);
  }

  sock.on('message', function(msg) {
    console.log(id, "message", msg.utf8Data);
    try {
      var data = JSON.parse(msg.utf8Data);
      methods[data.type](data.data);
    } catch (err) {
      report(id, err);
    }
  });

  methods = {robot: makeRobot, client: makeClient};
});

httpServer.listen(process.env.OPENSHIFT_NODEJS_PORT || 80, process.env.OPENSHIFT_NODEJS_IP);
