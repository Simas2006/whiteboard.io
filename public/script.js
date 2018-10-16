var canvas,ctx;
var lastPositions = [];
var colors = [];
var activeID,personalID;
var drawing = false;
var allowDrawing = true;
var saveData = [];
var lastSendTime = 0;
var socket = io();
var POINTS_BEFORE_SEND = 5;
var TIME_BEFORE_SEND = 12.5 * POINTS_BEFORE_SEND;

function drawAtMouse(event) {
  if ( ! drawing || (! allowDrawing && personalID != 1) ) return;
  var rect = canvas.getBoundingClientRect();
  var position = {
    x: (event.clientX - rect.left) / canvas.width,
    y: (event.clientY - rect.top) / canvas.width
  }
  ctx.strokeStyle = colors[activeID];
  ctx.lineWidth = canvas.width * (activeID != 0 ? 0.004 : 0.03);
  if ( ! lastPositions[activeID].x ) lastPositions[activeID] = position;
  ctx.beginPath();
  ctx.moveTo(lastPositions[activeID].x * canvas.width,lastPositions[activeID].y * canvas.width);
  ctx.lineTo(position.x * canvas.width,position.y * canvas.width);
  ctx.stroke();
  lastPositions[activeID] = position;
  saveData.push(position);
}

function produceDrawing(codemap) {
  codemap = JSON.parse(codemap);
  codemap = codemap.map(item => item && item[0] ? {x: item[0],y: item[1]} : item);
  var id = 0;
  for ( var i = 0; i < codemap.length; i++ ) {
    if ( codemap[i] === null ) {
      lastPositions[id] = {x: null,y: null}
      continue;
    }
    if ( ! isNaN(codemap[i]) ) {
      id = codemap[i];
      continue;
    }
    ctx.strokeStyle = colors[id];
    ctx.lineWidth = canvas.width * (id != 0 ? 0.004 : 0.03);
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
    var translation = JSON.stringify([activeID].concat(saveData).map(item => item && item.x ? [item.x,item.y] : item));
    socket.emit("codemap",translation);
    saveData = [];
    lastSendTime = 0;
  },1);
}

function toggleAllow() {
  allowDrawing = ! allowDrawing;
  socket.emit("special","ALLOW " + (allowDrawing ? "true" : "false"));
  document.getElementById("allowButton").innerText = allowDrawing ? "Disallow" : "Allow";
}

socket.on("codemap",function(codemap) {
  produceDrawing(codemap);
});
socket.on("confirm",function(response) {
  response = JSON.parse(response);
  activeID = response.id;
  personalID = response.id;
  colors = response.colors;
  lastPositions = response.colors.map(item => {return {x: null,y: null}});
  allowDrawing = response.allowDrawing;
  document.getElementById("allowButton").innerText = allowDrawing ? "Disallow" : "Allow";
  if ( personalID == 1 ) document.getElementById("specialControls").style.display = "inline-block";
  socket.emit("ready",location.search.slice(1));
});
socket.on("connection",function(data) {
  data = JSON.parse(data);
  lastPositions[data.id] = {x: null,y: null}
  colors[data.id] = data.color;
});
socket.on("clear",function() {
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,canvas.width,canvas.height);
});
socket.on("allow",function(value) {
  allowDrawing = value == "true";
});

window.onmousemove = drawAtMouse;
window.onmousedown = function() {
  drawing = true;
}
window.onmouseup = function() {
  drawing = false;
  lastPositions[activeID] = {x: null,y: null}
  saveData.push(null);
}
window.onload = function() {
  canvas = document.getElementById("canvas");
  canvas.width = Math.min(window.innerWidth,window.innerHeight * 0.9);
  canvas.height = Math.min(window.innerWidth,window.innerHeight * 0.9);
  ctx = canvas.getContext("2d");
  sendData();
}
