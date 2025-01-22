
/*
    Die Includes, Welche Pakete brauchen wir?
    Für Basic-Setup:
    -Express
    -HTTP
    -SocketIO
    -(max-api)
*/

// Ein Modul für alle möglichen Webanwendungen, also für alles was HTTP Daten durch die Gegend schickt, Server, Parsers, Multiplexer etcpp.
const express = require('express')

// Not necessarily needed, allows Cross Origin Resource Sharing in case we ever need it
const cors = require('cors')

// Das HTTP Modul, Grund-Funktionen um Hyper Text Transfer Protocol zu benutzen
const http = require('http')

// Der Socket.IO Server (client auf der anderen Seite). Stellt eine Websocket Verbindung zwischen Client und Server da um eine bidirektionale Verbindung zu haben
const { Server } = require("socket.io");

// Spezielles Modul für das Benutzen innerhalb von MaxMSP, gibt Funktionen zur Kommunikation mit Max wie Max.outlet oder Max.post
const Max = require('max-api');


/*
    Erstellt den HTTP Server und SocketIO Server
*/
let app = express();
app.use(cors());

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
  Die "Einstiegs-Funktion" für Socket.IO. Was passiert wenn ein client (socket) sich verbindet =>
  Alle weiteren Callbacks für diese sockets werden dann als Event-Listener-Callbacks direkt in dieser Funktion hinzugefügt (e.g. socket.on("event-name", callback))
*/

// Was soll passieren, wenn ein socket sich verbindet
socketIO.on('connection', (socket) => {
    
    // Füge speziellen Code für den socket in Form von Callbacks hinzu.
    // Einfacher: Wenn Server message "x" an den Socket schickt, führe Funktion "y" damit aus.
    // Hier in Form einer anonymen arrow Funktion () =>
    socket.on('client', (number) => {
        Max.outlet("Client says: ", number);
    });
});







/*
------------------------------------ ! DANGER AFTER THIS POINT ! -------------------------------------
Spezial-Anwendungen bzw. erweiterte Smartphone Funktionalität wie Sensorik, Microphone und Kamera access
Kann unter Umständen sehr komplex und speziell werden, da jedes System und jedes Modell seine eigenen Quirks hat.
*/


const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');

const { default: ffmpegPath } = require('ffmpeg-static');
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');


/*
    Verarbeite AUDIO von Handy Mikrophonen
*/

const storage = multer.memoryStorage();
const upload = multer(); // { dest: "uploads/" }


// app.post('/upload-audio', upload.single('audio'), (req, res) => {
//     console.log('Received audio from client');

//     // Get the path of the saved file
//     const filePath = req.file.path;
//     const originalName = req.file.originalname;

//     console.log(`Audio file saved at: ${filePath}`);
//     console.log(`Original filename: ${originalName}`);

//     // Notify MaxMSP about the saved file (optional)
//     //Max.outlet(`load_audio ${filePath}`);

//     //res.send(`Audio file successfully uploaded and saved as ${originalName}`);
// });
  
app.post('/upload-audio', upload.single('audio'), (req, res) => {
  const audioBuffer = req.file.buffer;  // The in-memory buffer
  const readableStream = new stream.PassThrough();
  readableStream.end(audioBuffer);  // Convert buffer to stream for ffmpeg

  // Create a writable stream to handle the decoded PCM data
  const writableStream = new stream.PassThrough();
  audioData = [];

  // Handle data as it's being decoded
  writableStream.on('data', (chunk) => {
    // Convert the chunk (buffer) into an array of numbers
    const chunkArray = Array.from(new Uint8Array(chunk));
    audioData.push(...chunkArray);
  });

  // Handle when the decoding is finished
  writableStream.on('end', () => {
    convertToSamples();
    outputToMax();
  });

  writableStream.on('error', (err) => {
    console.error('Error processing audio:', err);
    res.status(500).send('Error processing audio');
  });

  // Pipe the decoded PCM data to the writable stream
  ffmpeg(readableStream)
    .audioCodec('pcm_s16le')  // Convert to raw PCM 16-bit
    .format('s16le')  // Output format
    .pipe(writableStream)  // Pipe the output to the writable stream
});





// Audio data comes in as raw bytes, need to convert 2 bytes into a 16bit audio-sample
function convertToSamples() {
    samples = [];
    var sampleCount = Math.floor(audioData.length / 2);  // Two bytes per sample

    var byteArray = new Uint8Array(audioData);  // Explicitly handle as Uint8Array. not really needed?

    for (var i = 0; i < sampleCount; i++) {
        // Combine two bytes into a 16-bit signed integer (little-endian)
        var lowerByte = byteArray[i * 2];
        var upperByte = byteArray[i * 2 + 1];
        var sample = (upperByte << 8) | lowerByte;

        // If the upper byte is > 127, it's a negative number (signed 16-bit)
        if (upperByte > 127) {
            sample = -(65536 - sample);
        }

        // Normalize to range -1 to 1 for MaxMSP
        samples[i] = sample / 32768;
    }
}




let samplesLeft = 0;
let counter  = 0;
let chunkSize = 128;
let throttleTime = 1;


// outputs an audio chunk to maxmsp
function sendChunk()
{
    let output = [];
    let samplesToCopy = samplesLeft > chunkSize ? chunkSize : samplesLeft;

    for(let i = 0; i < samplesToCopy; ++i)
    {
        let sample = samples[i + counter];
        output.push(i + counter);
        output.push(sample);
    }
  
    Max.outlet("audiodata", output);

    counter += samplesToCopy;
    samplesLeft -= samplesToCopy;

    if(samplesLeft > 0)
    {
        setTimeout(sendChunk, throttleTime);
    }
}


function outputToMax()
{
    Max.outlet("audiostart", samples.length);
    samplesLeft = samples.length;
    counter = 0;

    if(samplesLeft > 0)
    {
        sendChunk()
    }

    Max.outlet("audioend");
}



// app.post('/upload-audio', upload.single('audio'), (req, res) => {
//     console.log('Received audio from client');

//     const audioBuffer = req.file.buffer; // In-memory buffer

//     const readableStream = new stream.PassThrough();
//     readableStream.end(audioBuffer); // Create a readable stream from the buffer

//     let rms = calculateRMS(req.file.buffer);
//     console.log(rms);

//     const outputFile = 'output.wav';

//     // Use FFmpeg to convert and save as WAV
//     ffmpeg(readableStream)
//         .audioCodec('pcm_s16le') // Ensure raw PCM 16-bit encoding
//         .format('wav') // Specify WAV format
//         .on('error', (err) => {
//             console.error('Error processing audio:', err);
//             res.status(500).send('Error processing audio');
//         })
//         .on('end', () => {
//             console.log(`File saved as ${outputFile}`);
//             res.send('Audio file successfully saved as WAV');
//             Max.outlet("audiofile", outputFile);
//         })
//         .save(outputFile); // Save directly to a file 
// });




// const calculateRMS = (buffer) => {
//     let sumOfSquares = 0;
//     const int16Array = new Int16Array(buffer);

//     for (let i = 0; i < int16Array.length; i++) {
//         sumOfSquares += int16Array[i] * int16Array[i];
//     }

//     const meanSquare = sumOfSquares / int16Array.length;
//     return Math.sqrt(meanSquare);
// };




/*
    Verarbeite VIDEO von Handy Webcams
*/
app.post('/upload-video', upload.single('video'), (req, res) => {

    console.log("received video data");
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    
    const videoBuffer = req.file.buffer; // Access the video buffer
    const readableStream = new stream.PassThrough();
    readableStream.end(videoBuffer); // Convert buffer to a readable stream for FFmpeg

    const outputPath = `testvideo.mp4`; // Define the output file path

    // Process the video with FFmpeg
    ffmpeg(readableStream)
        .output(outputPath)
        .videoCodec('libx264') // Use H.264 encoding for compatibility
        .format('mp4') // Ensure MP4 format
        .on('end', () => {
            console.log(`Video file processed and saved as: ${outputPath}`);
            
            // Notify MaxMSP about the processed video file
            setTimeout(() => {
                Max.outlet('videofile', outputPath);
            }, 1000);

            res.send('Video uploaded, processed, and MaxMSP notified.');
        })
        .on('error', (err) => {
            console.error('Error processing video:', err);
            res.status(500).send('Error processing video');
        })
        .run();
});