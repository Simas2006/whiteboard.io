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
  });
  socket.on("codemap",function(codemap) {
    if ( ! allowDrawing && uid != 1 ) return;
    permanentCodemap = permanentCodemap.concat(JSON.parse(codemap));
    socket.broadcast.emit("codemap",codemap);
  });
  socket.on("special",function(command) {
    if ( uid != 1 ) return;
    command = command.split(" ");
    if ( command[0] == "CLEAR" ) {
      socket.emit("clear");
      socket.broadcast.emit("clear");
      permanentCodemap = [];
    } else if ( command[0] == "ALLOW" ) {
      allowDrawing = command[1] == "true";
      socket.broadcast.emit("allow",allowDrawing ? "true" : "false");
    } else if ( command[0] == "LOCK" ) {
      connectionsLocked = command[1] == "true";
    }
  });
});

http.listen(PORT,function() {
  console.log("Listening on port " + PORT);
});
