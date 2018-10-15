var canvas,ctx;
var lastPositions = [];
var colors = [];
var personalID = 0;
var drawing = false;
var saveData = [];
var lastSendTime = 0;
var socket = io();
var POINTS_BEFORE_SEND = 5;
var TIME_BEFORE_SEND = 12.5 * POINTS_BEFORE_SEND;

function drawAtMouse(event) {
  if ( ! drawing ) return;
  var rect = canvas.getBoundingClientRect();
  var position = {
    x: (event.clientX - rect.left) / canvas.width,
    y: (event.clientY - rect.top) / canvas.width
  }
  ctx.strokeStyle = colors[personalID];
  ctx.lineWidth = 2.5;
  if ( ! lastPositions[personalID].x ) lastPositions[personalID] = position;
  ctx.beginPath();
  ctx.moveTo(lastPositions[personalID].x * canvas.width,lastPositions[personalID].y * canvas.width);
  ctx.lineTo(position.x * canvas.width,position.y * canvas.width);
  ctx.stroke();
  lastPositions[personalID] = position;
  saveData.push(position);
}

function produceDrawing(codemap) {
  codemap = JSON.parse(codemap);
  codemap = codemap.map(item => item && item[0] ? {x: item[0],y: item[1]} : item);
  ctx.lineWidth = 2.5;
  var id = 0;
  console.log(codemap);
  for ( var i = 0; i < codemap.length; i++ ) {
    if ( ! codemap[i] ) {
      lastPositions[id] = {x: null,y: null}
      continue;
    }
    if ( ! isNaN(codemap[i]) ) {
      id = codemap[i];
      continue;
    }
    ctx.strokeStyle = colors[id];
    if ( ! lastPositions[id].x ) lastPositions[id] = codemap[i];
    ctx.beginPath();
    ctx.moveTo(lastPositions[id].x * canvas.width,lastPositions[id].y * canvas.width);
    ctx.lineTo(codemap[i].x * canvas.width,codemap[i].y * canvas.width);
    ctx.stroke();
    lastPositions[id] = codemap[i];
  }
}

function sendData() {
  setInterval(function() {
    lastSendTime++;
    if ( saveData.length < POINTS_BEFORE_SEND ) {
      lastSendTime++;
      if ( lastSendTime < TIME_BEFORE_SEND || saveData.length <= 0 ) return;
    }
    var translation = JSON.stringify([personalID].concat(saveData).map(item => item && item.x ? [item.x,item.y] : item));
    socket.emit("codemap",translation);
    saveData = [];
    lastSendTime = 0;
  },1);
}

window.onmousemove = drawAtMouse;
window.onmousedown = function() {
  drawing = true;
}
window.onmouseup = function() {
  drawing = false;
  lastPositions[personalID] = {x: null,y: null}
  saveData.push(null);
}

socket.on("codemap",function(codemap) {
  produceDrawing(codemap);
});
socket.on("confirm",function(response) {
  response = JSON.parse(response);
  personalID = response.id;
  colors = response.colors;
  lastPositions = response.colors.map(item => {return {x: null,y: null}});
  socket.emit("ready");
});
socket.on("connection",function(data) {
  data = JSON.parse(data);
  lastPositions[data.id] = {x: null,y: null}
  colors[data.id] = data.color;
});

window.onload = function() {
  canvas = document.getElementById("canvas");
  canvas.width = Math.min(window.innerWidth,window.innerHeight);
  canvas.height = Math.min(window.innerWidth,window.innerHeight);
  ctx = canvas.getContext("2d");
  sendData();
}
