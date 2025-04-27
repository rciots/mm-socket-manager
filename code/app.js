const express = require('express');
const app = express();
var env = require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const clientCACert = 'certs/clientCA.crt';
const serverKey = 'certs/server.key';
const serverCert = 'certs/server.crt';
const { Server } = require("socket.io");
const KEY_PASSPHRASE = process.env.KEY_PASSPHRASE || "";
const port = process.env.PORT || 8081;
const internalport = process.env.INTERNAL_PORT || 8082;
var uisocket = "";
var connsocket = "";
const edgeio = new Server(https.createServer({
  key: fs.readFileSync(serverKey, 'utf-8'),
  passphrase: KEY_PASSPHRASE,
  cert: fs.readFileSync(serverCert, 'utf-8'),
  ca: [fs.readFileSync(clientCACert, 'utf-8')],
  requestCert: true
}).listen(port, () => {
  console.log(`WebSocket Secure Server listening on port${port}`);
}));


let socketUI, socketDevice, socketMid;




const intio = new Server(http.createServer(app).listen(internalport, () => {
  console.log(`Internal Web Socket Server listening on port${internalport}`);
}
));


edgeio.on('connection', (socket) => {
  socketDevice = socket;
    console.log('IO: a user connected');
    socketDevice.on('disconnect', () => {
      console.log('user disconnected');
    });
    socketDevice.on('video', (data) => {
      if (intio.sockets.sockets != "") {
        intio.emit("video", data);
      }
    });
    socketDevice.on('winner', (data) => {
      console.log("winner: " + data);
      socketUI.emit("winner", data);
    });
    socketDevice.on('selectedColors', (data) => {
      console.log("selectedColors: " + data);
      socketUI.emit("selectedColors", data);
    });
    edgeio.on('disconnect', () => {
      socketDevice = "";
      console.log('device disconnected');
    });
});


intio.on('connection', (socket) => {
    console.log(socket.handshake.headers);
    if (socket.handshake.headers.origin == "ui") {
      socketUI = socket;
      console.log('front connected');
      socketUI.on("movement", (data) => {
        console.log("Movimiento recibido:", data);
        if ((socketDevice != "") && (socketDevice != undefined)) {
          socketDevice.emit("movement", data);
        }
      }
      );
      socketUI.on("led", (data) => {
        console.log("led: " + data);
        socketDevice.emit("led", data);
      });
      socketUI.on("panic", () => {
        socketDevice.emit("panic");
      });
      socketUI.on("user_on", (status) => {
        console.log("emit user_on: " + status);
        socketMid.emit("user_on", status);
      });
      socketUI.on('disconnect', () => {
        socketUI = "";
        console.log('front disconnected');
      });
      socketUI.on("endgame", (data) => {
        console.log("endgame: " + data);
        socketDevice.emit("endgame", data);
      });
    } else if (socket.handshake.headers.origin == "middleware") {
      socketMid = socket;
      console.log('middleware connected');
      socketMid.on('disconnect', () => {
        socketMid = "";
        console.log('middleware disconnected');
      });
    }

});
