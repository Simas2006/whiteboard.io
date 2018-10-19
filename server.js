var fs = require("fs");
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var PORT = process.argv[2] || 8000;
var servers = {};

var padHex = n => "0".repeat(6 - n.length) + n;

app.use("/public",express.static(__dirname + "/public"));

app.get("/",function(request,response) {
  response.redirect("/public/index.html");
});

class Server {
  constructor() {
    this.names = ["eraser"];
    this.colors = ["#ffffff"];
    this.permanentCodemap = [];
    this.allowDrawing = true;
    this.connectionsLocked = false;
    this.uidsToKick = [];
  }
  setupQueries(socket) {
    if ( this.connectionsLocked ) {
      socket.emit("connectionsLocked");
      socket.disconnect();
      return;
    }
    this.names.push(null);
    var uid = this.colors.push("#" + padHex(Math.floor(Math.random() * 0x1000000).toString(16))) - 1;
    socket.emit("metadata",JSON.stringify({
      id: uid,
      colors: this.colors,
      names: this.names,
      allowDrawing: this.allowDrawing
    }));
    socket.on("sendCodemap",(name) => {
      if ( ! name ) return;
      this.names[uid] = name;
      socket.broadcast.emit("connection",JSON.stringify({
        id: uid,
        color: this.colors[uid],
        name: name
      }));
      socket.emit("codemap",JSON.stringify(this.permanentCodemap));
      socket.emit("log",`[Server] ${name} connected`);
      socket.broadcast.emit("log",`[Server] ${name} connected`);
    });
    socket.on("codemap",(codemap) => {
      if ( ! this.allowDrawing && uid != 1 ) return;
      this.permanentCodemap = this.permanentCodemap.concat(JSON.parse(codemap));
      socket.broadcast.emit("codemap",codemap);
    });
    socket.on("disconnect",() => {
      socket.broadcast.emit("disconnection",uid);
      socket.broadcast.emit("log",`[Server] ${this.names[uid]} disconnected`);
      this.names[uid] = null;
    });
    socket.on("special",(command) => {
      if ( uid != 1 ) return;
      command = command.split(" ");
      if ( command[0] == "CLEAR" ) {
        socket.emit("clear");
        socket.broadcast.emit("clear");
        socket.emit("log",`[Server] ${this.names[1]} cleared the board`);
        socket.broadcast.emit("log",`[Server] ${this.names[1]} cleared the board`);
        this.permanentCodemap = [];
      } else if ( command[0] == "ALLOW" ) {
        this.allowDrawing = command[1] == "true";
        socket.broadcast.emit("allow",this.allowDrawing ? "true" : "false");
        socket.emit("log",`[Server] ${this.names[1]} ${this.allowDrawing ? "en" : "dis"}abled drawing`);
        socket.broadcast.emit("log",`[Server] ${this.names[1]} ${this.allowDrawing ? "en" : "dis"}abled drawing`);
      } else if ( command[0] == "LOCK" ) {
        this.connectionsLocked = command[1] == "true";
        socket.emit("log",`[Server] ${this.names[1]} ${this.connectionsLocked ? "" : "un"}locked the board to new users`);
        socket.broadcast.emit("log",`[Server] ${this.names[1]} ${this.connectionsLocked ? "" : "un"}locked the board to new users`);
      } else if ( command[0] == "KICK" ) {
        if ( isNaN(parseInt(command[1])) ) return;
        this.uidsToKick.push(parseInt(command[1]));
      }
    });
    setInterval(() => {
      if ( this.uidsToKick.indexOf(uid) > -1 ) {
        this.uidsToKick.splice(this.uidsToKick.indexOf(uid),1);
        socket.emit("kick");
        socket.broadcast.emit("disconnection",uid);
        socket.disconnect();
        this.names[uid] = null;
      }
    },500);
  }
}

io.on("connection",function(socket) {
  socket.on("setServer",function(id) {
    if ( ! servers[id] ) {
      socket.emit("invalidServer");
      socket.disconnect();
      return;
    }
    servers[id].setupQueries(socket);
  });
  socket.emit("sendServer");
});

http.listen(PORT,function() {
  servers["123456"] = new Server();
  console.log("Listening on port " + PORT);
});
