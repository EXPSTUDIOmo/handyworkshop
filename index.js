
/*
    index.js
   
*/

const Max = require('max-api');

Max.addHandler("echo", (number) => {
    Max.outlet("Max said ", number);
});

Max.addHandler("start", () => {
    socketIO.emit("start");
});

Max.addHandler("stop", () => {
    socketIO.emit("stop");
});


const express = require('express')
const http = require('http')
const path = require('path');

const { Server } = require("socket.io");



let app = express();
app.use(express.static('public'));

let httpServer = http.createServer(app);

const PORT = 80 // 80 ist der Standard HTTP Port, 443 der Standard für HTTPS
httpServer.listen(PORT, () => {
    console.log("HTTP Server ist aktiv und wartet auf Port ", PORT)
});


socketIO = new Server(httpServer);    


socketIO.on('connection', (socket) => {
    socket.on('sound', () => {
        Max.outlet("sound");
    });
});

