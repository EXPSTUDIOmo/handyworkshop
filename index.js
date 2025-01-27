
/*

    Smartphone Workshop 2025

    Node.js Backend Server
*/

// Ein Modul für alle möglichen Webanwendungen, also für alles was HTTP Daten durch die Gegend schickt, Server, Parsers, Multiplexer etcpp.
const express = require('express')


// Das HTTP Modul, Grund-Funktionen um Hyper Text Transfer Protocol zu benutzen
const http = require('http')

// Der Socket.IO Server (client auf der anderen Seite). Stellt eine Websocket Verbindung zwischen Client und Server da um eine bidirektionale Verbindung zu haben
const { Server } = require("socket.io");

// Spezielles Modul für das Benutzen innerhalb von MaxMSP, gibt Funktionen zur Kommunikation mit Max wie Max.outlet oder Max.post
const Max = require('max-api');

const path = require('path');

/*
    Erstellt den HTTP Server und SocketIO Server
*/
let app = express();


let httpServer = http.createServer(app);
socketIO = new Server(httpServer);     

const PORT = 5005
httpServer.listen(PORT, () => {
    console.log("HTTP Server ist aktiv und wartet auf Kunden auf Port ", PORT)
});


/*  
    Express Middleware
    Bezeichnet Code, der die grundlegende Funktionsweise von Express beeinflusst bzw. erzeugt,
    also z.B. "Bei jeglichem POST request mache erstmal das"

    In unserem Falle einfach: "Für alle Anfragen jeglicher Art, nutze den Ordner "public" um Daten zu suchen"
    Ähnlich wie Max filepath Zeug, das heißt wenn ein client "/cat_picture.jpg" schickt, sucht express im ordner public nach cat_picture.jpg
*/
app.use(express.static('public'));




/*
    Fügt Callbacks für Max hinzu, also welche Messages kann man aus Max ins node.script Objekt schicken
*/
Max.addHandler("echo", (number) => {
    Max.outlet("Max said ", number);
});


Max.addHandler("start", () => {
    socketIO.emit("start")
});

Max.addHandler("stop", () => {
    socketIO.emit("stop")
});




/*
  Die "Einstiegs-Funktion" für Socket.IO. Was passiert wenn ein client (socket) sich verbindet:
*/

// Was soll passieren, wenn ein socket sich verbindet
socketIO.on('connection', (socket) => {
    
    // Füge speziellen Code für die sockets in Form von Callbacks hinzu.
    // Einfach gesagt: Wenn ein Client message "x" an mich schickt, führe Funktion "y" damit aus.
    // Hier in Form einer anonymen arrow Funktion () =>
    socket.on('client', (number) => {
        Max.outlet("Client says: ", number);
    });

    socket.on('orientation', (orientationEvent) => {
        Max.outlet('orientation', socket.id,  orientationEvent.alpha, orientationEvent.beta, orientationEvent.gamma);
    })

    socket.on('motion', (motionEvent) => {
        Max.outlet('motion', socket.id, motionEvent.acc_gx, motionEvent.acc_gy, motionEvent.acc_gz, motionEvent.acc_x, motionEvent.acc_y, motionEvent.acc_z, motionEvent.rot_a, motionEvent.rot_b, motionEvent.rot_g);
    })
});







/*
------------------------------------ ! DANGER AFTER THIS POINT ! -------------------------------------
------------------------------------ ! DANGER AFTER THIS POINT ! -------------------------------------
Spezial-Anwendungen bzw. erweiterte Smartphone Funktionalität wie Sensorik, Mikrophon und Kamera access
Kann unter Umständen sehr komplex und speziell werden, da jedes System und jedes Modell seine eigenen Quirks hat.
*/

const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');
const multer = require('multer');

// Konfiguriert multer, definiert wie mit uploads umgegangen werden soll
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    },
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
  })
  

const upload = multer({storage});

const { default: ffmpegPath } = require('ffmpeg-static');
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');




/*
    Verarbeite AUDIO von Handy Mikrophonen
    Die Handies schicken die Audio-Daten je nach Hersteller als .webm, .ogg oder .mp4 file.
    Hier im Server nutzen wir die Macht von ffmpeg, um jegliches Eingangsformat in .wav umzuwandeln.
*/

app.post('/upload-audio', upload.single('audio'), (req, res) => {

    const uploadedFilePath = path.join(__dirname, 'uploads', req.file.filename);
    const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}.wav`); // Datei wird aktuelles Datum als Name haben

    // Konvertierung in wav. ffmpeg schaut nach welches Ausgangsformat vorliegt
    // und sieht dann anhand von "output.wav", dass wir eine wav Datei wollen
    ffmpeg(uploadedFilePath)
        .output(outputFilePath)
        .on('end', () => {
            Max.outlet('audiofile', outputFilePath);
            res.status(200).send({ message: 'Audio uploaded and converted to WAV format', outputFilePath });
        })
        .on('error', (err) => {
            console.error('Error during conversion:', err);
            res.status(500).send({ error: 'Failed to convert audio to WAV' });
        })
        .run();
  });





/*
    Verarbeite VIDEO von Handy Webcams
*/
app.post('/upload-video', upload.single('video'), (req, res) => {

    const inputFilePath = path.join(req.file.destination, req.file.filename);
    const outputPath = path.join(__dirname, 'uploads', `${Date.now()}.mp4`);
    
    if (req.file.mimetype === 'video/mp4') 
    {
        Max.outlet('videofile', req.file.filename)
        res.send({ message: 'Video uploaded without conversion', filePath: inputFilePath });
    } 

    else 
    {
        ffmpeg(inputFilePath)
            .output(outputPath)
            .videoCodec('libx264')
            .format('mp4')
            .on('end', () => {
                Max.outlet('video', outputPath)
                res.send({ message: 'Video uploaded and converted', filePath: outputPath });
            })
            .on('error', (err) => {
                console.error('Error processing video:', err);
                res.status(500).send('Error processing video');
            })
            .run();
    }
});