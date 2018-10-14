var canvas,ctx;
var lastPositions = [
  {x: null,y: null},
  {x: null,y: null}
];
var drawing = false;
var saveData = [];
var socket = io();
var SEND_PERIOD = 25;

function drawAtMouse(event) {
  if ( ! drawing ) return;
  var rect = canvas.getBoundingClientRect();
  var position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
  }
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2.5;
  if ( ! lastPositions[0].x ) lastPositions[0] = position;
  ctx.beginPath();
  ctx.moveTo(lastPositions[0].x,lastPositions[0].y);
  ctx.lineTo(position.x,position.y);
  ctx.stroke();
  lastPositions[0] = position;
  saveData.push(position);
}

function produceDrawing(id,codemap) {
  codemap = JSON.parse(codemap);
  codemap = codemap.map(item => item ? {x: item[0],y: item[1]} : null);
  for ( var i = 0; i < codemap.length; i++ ) {
    if ( ! codemap[i] ) {
      lastPositions[id] = {x: null,y: null}
      continue;
    }
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2.5;
    if ( ! lastPositions[id].x ) lastPositions[id] = codemap[i];
    ctx.beginPath();
    ctx.moveTo(lastPositions[id].x,lastPositions[id].y);
    ctx.lineTo(codemap[i].x,codemap[i].y);
    ctx.stroke();
    lastPositions[id] = codemap[i];
  }
}

function sendData() {
  
}

window.onmousemove = drawAtMouse;
window.onmousedown = function() {
  drawing = true;
}
window.onmouseup = function() {
  drawing = false;
  lastPositions[0] = {x: null,y: null}
  saveData.push(null);
}

window.onload = function() {
  canvas = document.getElementById("canvas");
  canvas.width = Math.min(window.innerWidth,window.innerHeight);
  canvas.height = Math.min(window.innerWidth,window.innerHeight);
  ctx = canvas.getContext("2d");
  sendData();
}
