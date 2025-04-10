/*
  Die Client Seite. 
  Dieses Script beinhaltet allen Code, der für die Client App auf dem Handy nötig ist.
*/

/* Instanziere ein neues socket.io client Object. 
   Hierfür wird die socket.io.js client datei benötigt. Diese kann auf unterschiedliche Art eingebunden werden.
   Die "professionelle" Lösung ist einen sog. bundler wie "webpack" zu benutzen. 
   Alternativ kann man die Datei per CDN (Content Delivery Network) einbinden oder lokal ins Projekt einbinden.
   In diesem Falle ist sie ganz simpel als lokale datei im Ordner vorhanden und wird im index.html aufgerufen

   Socket.io ist schlau und braucht keine zusätzlichen Argumente wie Port oder IP, es findet diese Dinge automatisch
   basierend auf der normalen HTTP Verbindung und verbindet sich automatisch mit dem socket.io server
   Wenn man hingegen möchte, dass sich socket nicht mit dem "Heimserver", sondern einem fremden Server verbindet,
   müsste man dies als Argumente in den io() Konstruktur geben.
*/ 
const socket = io();


/*
    Socket Event Callbacks (was soll ich tun, wenn server die Nachricht X schickt)

    In unserem Falle denkbar einfach, wenn server start sagt, spiele Soundfile ab.
*/
socket.on('start', (number) => {
    sound.play();
    // number Argument wird hier ignoriert, man könnte z.B. damit das Soundfile auswählen etcpp.
})

socket.on('stop', () => {
    sound.stop();
});



/*
    AUDIO
    Ich benutze die library Howler.js zum Abspielen von Audio anstelle des eingebauten <audio> tags. 
    Howler ist sehr mächtig und gut programmiert, ermöglicht WebAudio als auch HTML audio, einfache syntax, performativ.
    Interessant hieran ist Javascripts Hoisting, das heißt sound wird definiert NACHDEM es oben in den socket callbacks vorkam.
    In C / C++ wäre das z.B. nicht möglich
*/
let sound = new Howl({
  src: ['SS11.mp3'], // relativer Pfad zum soundfile von client.js aus gesehen
  loop: true, // das soundfile wird loopen
  html: false // nutzt webaudio, sofern möglich
})





/*
    Verbindung zu unserem HTML Dokument. 
    Verknüpfung von buttons, slidern etc. mit Javascript
    Javascript hat die eingebaute document variable. document ist eine Repräsentation
    unseres HTML Dokuments. 
*/


let startButton = document.getElementById('start_button');
let stopButton = document.getElementById('stop_button');
let connectButton = document.getElementById('connect_button');

/*
  Fügt sog. Event Listener Callbacks hinzu, also wenn  button geclickt wird, mache dies
*/

startButton.addEventListener('click', handleRecordStart);
stopButton.addEventListener('click', handleRecordStop);

// ^
// Hier sieht man, dass sowohl eine benannte Funktion als auch eine anonyme arrow Funktion benutzt werden kann
// v

connectButton.addEventListener('click', () => {
    document.body.style.backgroundColor = "green";
    socket.emit('connect_super_event', "Ein Client hat auf den Connect Button gedrückt");
})






/*
  ========================= ! DANGER ! ============================
  ========================= ! DANGER ! ============================
  Ab hier der Code der NICHT mehr im Workshop dran kam. Ab hier gehts um Mikrophon, Kamera und Sensoren
*/



/*
  AUDIO
*/

let mediaRecorder;
let audioChunks = [];


/*
  NB!
  In diesem Teil kommen oft async / await vor. Dies bezeichnet asynchrones Programmieren in Javascript,
  das heißt dieser Code wird nicht direkt im Hauptthread ausgeführt, sondern Javascript handhabt ihn
  in einem separaten Neben-Thread, ohne auf dessen Ausführung zu warten.
  Das macht bei allen Online Sachen sinn, da wir nie wissen wielange es dauert bis Daten geschickt / empfangen werden 
  und wir nicht 90 Sekunden das Handy einfrieren wollen, während es auf eine Antwort eines Servers wartet.
  Genaue Syntax und Handhabung ist nicht ganz trivial, mehr dazu wie immer im Internet
*/



/* NB!
  Da wir die Permissions erst hier abfragen und dann direkt den Aufnahme Prozess starten, 
  ist der erste Audio-Upload muted. Das ließe sich lösen, wenn z.B. Permission Abfrage beim Connect-Button wäre.
  Für Demo Zwecke jetzt nicht relevant, für echte Anwendung müsste man das sauber machen
*/
// Startet den Aufnahme Prozess wenn ein User auf den Aufnahme Button drückt
async function handleRecordStart() {
    document.body.style.backgroundColor = "red";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Diese Zeile löst eine "Erlaubnis-Abfrage" auf den Handys aus
    mediaRecorder = new MediaRecorder(stream);
  
    audioChunks = [];
    mediaRecorder.start();
   
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data); // Immer wenn ein neuer Audio-Chunk fertig aufgenommen ist, füge ihn in unser audioChunks array hinzu.
    };
}

// Stoppt die Aufnahme und leitet die Verarbeitung der Audio-Chunks ein.
async function handleRecordStop() {
    mediaRecorder.stop();

    document.body.style.backgroundColor = "green";

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // audio/wav ist hier bisschen Fakenews, da das Handy trotzdem .ogg produziert. Aber schadet nicht zu haben
      const audioUrl = URL.createObjectURL(audioBlob);
      await uploadAudioToServer(audioBlob);
  };
}


// Lädt die fertig vorbereiteten Audio-Daten an den Server. 
async function uploadAudioToServer(audioBlob) {
    const mimeType = mediaRecorder.mimeType; 
    const fileExtension = mimeType.split(';')[0].split('/')[1]; 
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${fileExtension}`);

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
    Hier wird uns schon viel Arbeit vom HTML Dokument abgenommen. Geht allerdings NUR mit Handys
    Im HTML Dokument findet ihr ein <input> objekt (für jegliche Form von unser input gedacht) mit
    dem wichtigen argument 'capture="environment"'
    Dieses Capture Event (environment steht hierbei für die Kamera, 'portrait' vordere Kamera 'environment' hintere) 
    lässt das Handy wissen "Hey du kannst hier entweder ein Video Hochladen oder ich öffne für dich
    die Webcam und du kannst gleich hier ein Video aufnehmen was wir dann hochladen" - habt ihr vllt schonmal im Internet selbst erlebt
    z.B. bei Foto-Uploads

*/
const videoInput = document.getElementById('videoInput');

// Diesmal nicht click event, sondern 'change', also nachdem der User das input objekt (durch z.B. hochladen seines Videos) verändert hat
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
  Handy- Sensoren nutzen für Orientation & Motion
*/


// Der Callback für ein Orientation Event (Also Handy Sensoren haben eine Veränderung der Ausrichtung des Handys gemessen)
function handleOrientation(event) {

  let alpha = event.alpha; // x - vermutlich wichtigste Achse, "Kompass", wohin zeigt mein Handy
  let beta = event.beta; // y
  let gamma = event.gamma; // z 
 
  let orientationEvent = {
    alpha: alpha,
    beta: beta,
    gamma: gamma
  }

  // wir könnten alpha, beta, gamma auch direkt als 3 einzelne Argumente schicken, 
  // aber Daten in Objekte verpacken ist in Javascript meist die bessere Wahl
  socket.emit('orientation', orientationEvent);
}


// Callback wenn sich das Handy bewegt hat
function handleMotion(event) {
 
  // Denke die Namen der einzelnen Parameter sind relativ selbsterklärend (Danke Mozilla-Web-Council)
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

/* Hier Mal ein anderer Ansatz, wenn man z.B. nicht zwei Buttons will sondern einer start / stop macht.
   Anstelle von addEventListener können wir im onclick Feld auch direkt eine Funktion registrieren.
   Soll einfach zeigen, dass in Javascript oft verschiedene Wege möglich sind
   In diesem Falle hat ChatGPT halt .onclick gewählt
*/ 
motion_button.onclick = function(e) {
  e.preventDefault(); // Unterdrücke default Verhalten eines Buttons
  
  // Fragt Erlaubnis für Sensoren, ab iOS+ 13 nötig.
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








