var fs = require("fs");
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var PORT = process.argv[2] || 8000;
var colors = [];

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
  socket.on("codemap",function(codemap) {
    socket.broadcast.emit("codemap",uid + "," + codemap);
  });
});

http.listen(PORT,function() {
  console.log("Listening on port " + PORT);
});
