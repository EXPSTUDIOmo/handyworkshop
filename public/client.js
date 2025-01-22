/* Instanziere ein neues socket.io client Object. 
   Socket.io ist sehr schlau und braucht keine zusätzlichen Argumente wie Port oder IP, es findet diese Dinge automatisch
   basierend auf der normalen HTTP Verbindung
*/ 
const socket = io();

/*
    Ich benutze die library Howler.js zum Abspielen von Audio anstelle des eingebauten <audio> tags. 
    Howler ist sehr mächtig und gut programmiert, ermöglicht WebAudio als auch HTML audio, einfache syntax, performativ.
*/
let sound = new Howl({
    src: ['SS11.mp3'],
    loop: true,
    html: false
})


/*
    Socket Event Callbacks (was soll ich tun, wenn server die Nachricht X schickt)
*/
socket.on('start', (number) => {
    sound.play();
})

socket.on('stop', () => {
    sound.stop();
});




// /*
//     Verbindung zu unserem HTML Dokument (Verknüpfung von buttons, slidern etc. mit Javascript)
// */


// // REC/STOP Buttons für Mikrphon gebrauch
let startButton = document.getElementById('start_button');
let stopButton = document.getElementById('stop_button');
let connectButton = document.getElementById('connect_button');

connectButton.addEventListener('click', () => {
    document.body.style.backgroundColor = "green";
})



// /*
//     HANDY MICROPHONE NUTZEN
// */

// let mediaRecorder;
// let audioChunks = [];
// let isRecording = false;


// async function startRecording() {

//     document.body.style.backgroundColor = "red";

//     // ask for user permission for audio
//      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     mediaRecorder = new MediaRecorder(stream);
  
//     mediaRecorder.start();
//     audioChunks = [];
  
//     mediaRecorder.ondataavailable = event => {
//       audioChunks.push(event.data);
//     };
// }

// async function stopRecording() {

//     document.body.style.backgroundColor = "white";
//     mediaRecorder.stop();

//     mediaRecorder.onstop = async () => {
//     const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
//     const audioUrl = URL.createObjectURL(audioBlob);
   
//     // Send the recorded audio to the server
//     await sendAudioToServer(audioBlob);
//   };
// }


// startButton.addEventListener('click', startRecording);
// stopButton.addEventListener('click', stopRecording);

// startButton.addEventListener('touchstart', startRecording);  
// stopButton.addEventListener('touchend', stopRecording);  


// // Function to send the audio blob to the server
// async function sendAudioToServer(audioBlob) {
  
//   const formData = new FormData();
//   formData.append('audio', audioBlob, 'recording.wav');

//   await fetch('/upload-audio', {
//     method: 'POST',
//     body: formData,
//     headers: {
//         'Accept': 'audio/wav'
//       }
//   });
// }




// /*
//     WEBCAM Nutzen
// */


const videoInput = document.getElementById('videoInput');

videoInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch('/upload-video', {
            method: 'POST',
            body: formData,
        });

        const message = await response.text();
        console.log(message);
    }
});




let mediaRecorder;
let audioChunks = [];
let recordButton = document.getElementById('record_button');
let isRecording = false;


async function handlePress() {
    document.body.style.backgroundColor = "red";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
  
    audioChunks = [];
    mediaRecorder.start();
   
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };
}


async function handleRelease() {
    mediaRecorder.stop();

    document.body.style.backgroundColor = "green";

    mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
   
    // Send the recorded audio to the server
    await uploadAudioToServer(audioBlob);
  };
}




// Function to send the audio blob to the server
async function uploadAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.ogg');

    console.log("uploading audio")

    await fetch('/upload-audio', {
      method: 'POST',
      body: formData,
      headers: {
          'Accept': 'audio/wav'
        }
    });
  }


startButton.addEventListener('click', handlePress);
stopButton.addEventListener('click', handleRelease);
