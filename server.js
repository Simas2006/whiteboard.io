var fs = require("fs");
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var PORT = process.argv[2] || 8000;

var names = ["eraser"];
var colors = ["#ffffff"];
var permanentCodemap = [];
var allowDrawing = true;
var connectionsLocked = false;
var uidsToKick = [];

var padHex = n => "0".repeat(6 - n.length) + n;

app.use("/public",express.static(__dirname + "/public"));

app.get("/",function(request,response) {
  response.redirect("/public/index.html");
})

io.on("connection",function(socket) {
  if ( connectionsLocked ) {
    socket.emit("connectionsLocked");
    socket.disconnect();
    return;
  }
  names.push(null);
  var uid = colors.push("#" + padHex(Math.floor(Math.random() * 0x1000000).toString(16))) - 1;
  socket.emit("confirm",JSON.stringify({
    id: uid,
    colors: colors,
    names: names,
    allowDrawing: allowDrawing
  }));
  socket.on("ready",function(name) {
    if ( ! name ) return;
    names[uid] = name;
    socket.broadcast.emit("connection",JSON.stringify({
      id: uid,
      color: colors[uid],
      name: name
    }));
    socket.emit("codemap",JSON.stringify(permanentCodemap));
    socket.emit("log",`[Server] ${name} connected`);
    socket.broadcast.emit("log",`[Server] ${name} connected`);
  });
  socket.on("codemap",function(codemap) {
    if ( ! allowDrawing && uid != 1 ) return;
    permanentCodemap = permanentCodemap.concat(JSON.parse(codemap));
    socket.broadcast.emit("codemap",codemap);
  });
  socket.on("disconnect",function() {
    socket.broadcast.emit("disconnection",uid);
    socket.broadcast.emit("log",`[Server] ${names[uid]} disconnected`);
    names[uid] = null;
  });
  socket.on("special",function(command) {
    if ( uid != 1 ) return;
    command = command.split(" ");
    if ( command[0] == "CLEAR" ) {
      socket.emit("clear");
      socket.broadcast.emit("clear");
      socket.emit("log",`[Server] ${names[1]} cleared the board`);
      socket.broadcast.emit("log",`[Server] ${names[1]} cleared the board`);
      permanentCodemap = [];
    } else if ( command[0] == "ALLOW" ) {
      allowDrawing = command[1] == "true";
      socket.broadcast.emit("allow",allowDrawing ? "true" : "false");
      socket.emit("log",`[Server] ${names[1]} ${allowDrawing ? "en" : "dis"}abled drawing`);
      socket.broadcast.emit("log",`[Server] ${names[1]} ${allowDrawing ? "en" : "dis"}abled drawing`);
    } else if ( command[0] == "LOCK" ) {
      connectionsLocked = command[1] == "true";
      socket.emit("log",`[Server] ${names[1]} ${connectionsLocked ? "" : "un"}locked the board to new users`);
      socket.broadcast.emit("log",`[Server] ${names[1]} ${connectionsLocked ? "" : "un"}locked the board to new users`);
    } else if ( command[0] == "KICK" ) {
      if ( isNaN(parseInt(command[1])) ) return;
      uidsToKick.push(parseInt(command[1]));
    }
  });
  setInterval(function() {
    if ( uidsToKick.indexOf(uid) > -1 ) {
      uidsToKick.splice(uidsToKick.indexOf(uid),1);
      socket.emit("kick");
      socket.broadcast.emit("disconnection",uid);
      socket.disconnect();
      names[uid] = null;
    }
  },500);
});

http.listen(PORT,function() {
  console.log("Listening on port " + PORT);
});
