var fs = require("fs");
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var PORT = process.argv[2] || 8000;
var colors = ["#ffffff"];
var permanentCodemap = [];

var padHex = n => "0".repeat(6 - n.length) + n;

app.use("/public",express.static(__dirname + "/public"));

io.on("connection",function(socket) {
  var uid = colors.push("#" + padHex(Math.floor(Math.random() * 0x1000000).toString(16))) - 1;
  socket.broadcast.emit("connection",JSON.stringify({
    id: uid,
    color: colors[uid]
  }));
  socket.emit("confirm",JSON.stringify({
    id: uid,
    colors: colors
  }));
  socket.on("ready",function() {
    socket.emit("codemap",JSON.stringify(permanentCodemap));
  });
  socket.on("codemap",function(codemap) {
    permanentCodemap = permanentCodemap.concat(JSON.parse(codemap));
    socket.broadcast.emit("codemap",codemap);
  });
  socket.on("special",function(command) {
    if ( uid != 1 ) return;
    if ( command == "CLEAR" ) {
      socket.emit("clear");
      socket.broadcast.emit("clear");
      permanentCodemap = [];
    }
  });
});

http.listen(PORT,function() {
  console.log("Listening on port " + PORT);
});
