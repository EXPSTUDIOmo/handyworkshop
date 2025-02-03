
/*
    SERVER

    Smartphone Workshop 2025

    Node.js Server

    Der Server hosted unsere Client App. Nachdem er gestartet wurde hört er auf seinem Port, ob es Clients gibt.

*/


/*
    Am Anfang des Codes stehen meistens die includes (require), damit man sieht welche Pakete benutzt werden und 
    damit man die Pakete als Variablen zur Verfügung hat.
*/

// Spezielles Modul für das Benutzen innerhalb von MaxMSP, gibt Funktionen zur Kommunikation mit Max wie Max.outlet oder Max.post
// Ohne funktioniert der Code nicht in Max. Mit diesem Modul funktioniert der Code NUR mit Max
const Max = require('max-api');

// Ein Modul für alle möglichen Webanwendungen, also für alles was  HTTP-Daten durch die Gegend schickt, Server, Parsers, etcpp.
const express = require('express')

// Das HTTP Modul, Grund-Funktionen um HTTP (Hyper Text Transfer Protocol) zu benutzen
const http = require('http')

// Das Datei-Pfad Modul, wird benötigt um mit Node.js auf die Dateipfade des Server-Computers zuzugreifen.
const path = require('path');

// Der Socket.IO Server (client auf der anderen Seite). Stellt eine Websocket Verbindung zwischen Client und Server da um eine bidirektionale Verbindung zu haben
// Die {} Syntax bedeutet einen "Teil-Require", das heißt "ich möchte aus socket.io dieses Unterpaket laden"
const { Server } = require("socket.io");





/*
    Erstellt eine express app (Instanz der express Klasse) und erzeugt damit einen neuen HTTP Server der auf Port 5005 läuft.
*/
let app = express();
let httpServer = http.createServer(app);

const PORT = 5005
httpServer.listen(PORT, () => {
    console.log("HTTP Server ist aktiv und wartet auf Kunden auf Port ", PORT)
});


/*
    Erstellt den socket.io Server, als Argument nimmt er den http Server, von dem er die benötigten Daten bezieht
*/ 
socketIO = new Server(httpServer);    


/*  
    Express Middleware 
    Bezeichnet Code, der die grundlegende Funktionsweise von Express beeinflusst,
    also z.B. "Bei jeglichem GET request eines clients, mache erstmal das"

    In unserem Falle sehr einfach: "Für alle Anfragen jeglicher Art, nutze den Ordner "public" um Daten zu suchen"
    Ähnlich wie Max File-Settings, das heißt wenn ein client "/cat_picture.jpg" schickt, sucht express im ordner public nach cat_picture.jpg
    
    Wenn ein User sich verbindet  schickt er '/', was bedeutet er möchte die "root" Webseite, also index.html haben. Von dort wird dann 
    alles weitere Laden gestartet.
*/
app.use(express.static('public'));








/*
    Fügt Callbacks für Max hinzu, also welche Messages kann man aus Max ins node.script Objekt schicken
    Mit Max.outlet() kann man dann wieder Daten an Max schicken. mit Max.post() kann man in die Max console printen
*/

Max.addHandler("echo", (number) => {
    Max.outlet("Max said ", number);
});


Max.addHandler("start", () => {
    socketIO.emit("start");
});

Max.addHandler("stop", () => {
    socketIO.emit("stop");
});


/*
    Zur Erinnerung : () => {} nennt man Arrow-Functions. Sie sind eine Abkürzung ("Syntactic Sugar"), damit man nicht
    jedes mal eine Funktion mit Namen erstellen muss, um kurz etwas auszuführen. 
    Genaueres dazu online (arrow functions javascript)
*/



/*
  Die "Einstiegs-Funktion" für Socket.IO. Was passiert wenn ein client (socket) sich verbindet:
*/
socketIO.on('connection', (socket) => {
    /*
        An dieser Stelle haben wir Zugriff auf den / die sockets (clients). 
        in diesem "connection" callback fügen wir dann die weiteren Callbacks hinzu.
        Einfach: Wenn ein Client / Socket Befehl X schickt, führe Funktion Y aus
    */
    socket.on('start_soundfile', (index) => {
        Max.outlet("A Smartphone client wants to start sample: ", index);
    });


    // NB! Diese beiden Callbacks waren nicht Teil des Workshops, sondern sind für Funktionen von Part 2
    // Namentlich um die Motion-Sensoren der Handys an Max weiterzuleiten
    
    socket.on('orientation', (orientationEvent) => {
        Max.outlet('orientation', socket.id,  orientationEvent.alpha, orientationEvent.beta, orientationEvent.gamma);
    })

    socket.on('motion', (motionEvent) => {
        Max.outlet('motion', socket.id, motionEvent.acc_gx, motionEvent.acc_gy, motionEvent.acc_gz, motionEvent.acc_x, motionEvent.acc_y, motionEvent.acc_z, motionEvent.rot_a, motionEvent.rot_b, motionEvent.rot_g);
    })

    socket.on('hallo_server', (nachricht) => {
        Max.outlet("client", nachricht);
    })
});








/*
------------------------------------ ! DANGER AFTER THIS POINT ! -------------------------------------
------------------------------------ ! DANGER AFTER THIS POINT ! -------------------------------------
Hier kommen Speezialanwendungen die NICHT im Workshop besprochen wurden, namentlich wie man Mikrophon, Kamera und 
Bewegungs-Sensoren der Handys verarbeitet.


WICHTIG:  

Die meisten dieser Funktionen benötigen eine HTTPS Verbindung, damit die Handys die Übermittlung sensibler Daten,
wie Mikrophon oder Webcam erlauben. 
Das bedeutet wir benötigen ein gültiges (nicht selbst erzeugtes) HTTPS Zertifikat. Dies erhält man wenn man, wenn man
online eine Domain kauft.
Zum lokalen Entwickeln benötigen wir einen Service, der dies für uns übernimmt.

Ich empfehle hierfür ngrok (https://ngrok.com/)

ngrok erzeugt dann einen sicheren Tunnel zwischen einer von ihnen gehosteten temporären URL und unserer localhost Adresse.

Hierfür : 
1. Installieren
2. Terminal starten
3. "ngrok http 5005" eingeben. 5005 ist dabei der gewünschte Port, also sollte gleich sein wie der hier gewählte http port.

Dann nicht mehr über localhost:5005 verbinden sondern über die temporäre URL die euch ngrok gibt. 
*/

const fs = require('fs'); // File System Paket um Dateien lokal Speichern & Laden zu können
const ffmpeg = require('fluent-ffmpeg'); // ffmpeg Modul um zur Not Formate umzuwandeln (z.B. .ogg => .wav)
const stream = require('stream'); // Datei-Stream Modul, Medien-Dateien werden oft mit Streams Beschrieben / Gelesen. 
const multer = require('multer'); // Speziellies Biest, kümmert sich um (Formular) Datei-Uploads auf den Server

/* 
    Konfiguriert multer, definiert wie mit uploads umgegangen werden soll, ob z.B. Disk Storage oder RAM etc.
*/
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    },
    destination: function (req, file, cb) {
      cb(null, './uploads')
    },
  })
  
const upload = multer({storage});

// Sagt ffmpeg wo die normale binary wohnt. Eigentlich sollte das nicht nötig sein, bei mir ging es jedoch nicht ohne.
const { default: ffmpegPath } = require('ffmpeg-static');
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');






/*
    Verarbeite AUDIO von Handy Mikrophonen
    Die Handies schicken die Audio-Daten je nach Hersteller als .webm, .ogg oder .mp4 file.
    Hier im Server nutzen wir die Macht von ffmpeg, um jegliches Eingangsformat in .wav umzuwandeln
    und dann auf der Festplatte zu speichern. Sobald die Datei gespeichert ist, sagen wir Max "Hey hier gibts eine
    neue .wav Datei unter diesem Pfad"
*/

app.post('/upload-audio', upload.single('audio'), (req, res) => {

    const uploadedFilePath = path.join(__dirname, 'uploads', req.file.filename);
    const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}.wav`); // *1 Datei wird aktuelles Datum als Name haben

    // Konvertierung in wav. ffmpeg schaut nach welches Ausgangsformat vorliegt
    // und sieht dann anhand von "output.wav", dass wir eine wav Datei wollen
    ffmpeg(uploadedFilePath)
        .output(outputFilePath)
        .on('end', () => {
            Max.outlet('audiofile', outputFilePath);

            /*
            Diese response Antworten an den Client können wir uns eigentlich sparen, da wir alles über Socket.IO regeln
            und nicht die normalen HTTP Header / Responses nutzen. Der Vollständigkeit halber ist es aber nie verkehrt sie 
            drin zu lassen
            */

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
    Analog zum Audio, nur dass wir hier sicher stellen, dass am Ende alles .mp4 für Max ist.
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
            .videoCodec('libx264') // H.264 codec
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



/*

*1 Diese Syntax mit ${} nennt man ein String literal. Dafür werden besondere Anführungszeichen benötigt,
nämlich diese schrägen: ``

Darin kann man dann einen String schreiben und zeitgleich javascript code mit ${} direkt in den String einfügen

*/