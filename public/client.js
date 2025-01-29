/*
  CLIENT
*/





/* Instanziere ein neues socket.io client Object. 
   Hierfür wird die socket.io.js client datei benötigt. Diese kann auf unterschiedliche Art eingebunden werden.
   In diesem Falle ist sie ganz simpel als lokale datei im Ordner vorhanden und wird im index.html aufgerufen

   Socket.io ist schlau und braucht keine zusätzlichen Argumente wie Port oder IP, es findet diese Dinge automatisch
   basierend auf der normalen HTTP Verbindung und verbindet sich automatisch mit dem socket.io server
*/ 
const socket = io();


/*
    Socket Event Callbacks (was soll ich tun, wenn server die Nachricht X schickt)
*/
socket.on('start', (number) => {
    sound.play();
})

socket.on('stop', () => {
    sound.stop();
});



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
    Verbindung zu unserem HTML Dokument (Verknüpfung von buttons, slidern etc. mit Javascript)
*/


// REC/STOP Buttons für Mikrophon Gebrauch
let startButton = document.getElementById('start_button');
let stopButton = document.getElementById('stop_button');
let connectButton = document.getElementById('connect_button');
startButton.addEventListener('click', handleRecordStart);
stopButton.addEventListener('click', handleRecordStop);

connectButton.addEventListener('click', () => {
    document.body.style.backgroundColor = "green";
    socket.emit('hallo_server', "Client sagt hallo");
})






/*
  ================= ! DANGER ! ===============
  Nicht essentieller, komplizierterer Teil unten, um Mikrophon, Sensoren und Kamera zu benutzen
*/



/*
  AUDIO
*/

let mediaRecorder;
let audioChunks = [];
let recordButton = document.getElementById('record_button');
let isRecording = false;


async function handleRecordStart() {
    document.body.style.backgroundColor = "red";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
  
    audioChunks = [];
    mediaRecorder.start();
   
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };
}


async function handleRecordStop() {
    mediaRecorder.stop();

    document.body.style.backgroundColor = "green";

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      await uploadAudioToServer(audioBlob);
  };
}

async function uploadAudioToServer(audioBlob) {
    const mimeType = mediaRecorder.mimeType; 
    const fileExtension = mimeType.split(';')[0].split('/')[1];
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${fileExtension}`);

    console.log("uploading audio")

    await fetch('/upload-audio', {
      method: 'POST',
      body: formData,
      headers: {
          'Accept': 'audio/wav'
        }
    });
  }












/*
    WEBCAM Nutzen um Videodatein aufzunehmen und an den Server zu schicken
*/


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



/*
  Sensoren nutzen für Orientation & Motion
*/


// Callback with our orientation event
function handleOrientation(event) {
  let alpha = event.alpha;
  let beta = event.beta;
  let gamma = event.gamma;

  let orientationEvent = {
    alpha: alpha,
    beta: beta,
    gamma: gamma
  }
  socket.emit('orientation', orientationEvent);
}


// Callback with our motion event
function handleMotion(event) {
 
  let motionEvent =  {
    acc_gx: event.accelerationIncludingGravity.x, 
    acc_gy: event.accelerationIncludingGravity.y, 
    acc_gz: event.accelerationIncludingGravity.z,
    acc_x : event.acceleration.x, 
    acc_y : event.acceleration.y, 
    acc_z : event.acceleration.z,
    rot_a : event.rotationRate.alpha, 
    rot_b : event.rotationRate.beta, 
    rot_g : event.rotationRate.gamma
  } 

  socket.emit("motion", motionEvent);

}

let is_motion_running = false;
let motion_button = document.getElementById('motion_button');

// Add / Remove Listeners to the motion/orientation events the browser gives us.
motion_button.onclick = function(e) {
  e.preventDefault();
  
  // Request permission for iOS 13+ devices
  if (
    DeviceMotionEvent &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    DeviceMotionEvent.requestPermission();
  }
  
  if (is_motion_running){
    window.removeEventListener("devicemotion", handleMotion);
    window.removeEventListener("deviceorientation", handleOrientation);
    motion_button.innerHTML = "Start Motion Sensors";
    is_motion_running = false;
  }else{
    window.addEventListener("devicemotion", handleMotion);
    window.addEventListener("deviceorientation", handleOrientation);
    motion_button.innerHTML = "Stop Motion Sensors";
    is_motion_running = true;
  }
};












//console.log('3' - 1);
// console.log('3' + 1);