/*
  Die Client App
  Dieses Script beinhaltet allen Code, der für die Client App auf dem Handy nötig ist.
*/
const socket = io();

socket.on('start', (number) => {
    sound.play();
})

socket.on('stop', () => {
    sound.stop();
});


let sound = new Howl({
  src: ['samples/wald1.mp3'], 
  loop: true, 
  html: false 
})


let connectButton = document.getElementById('connect_button');

connectButton.addEventListener('click', () => {
  document.body.style.backgroundColor = "green";
  connectButton.style.display = "none";
  startButton.style.display = "block";
  stopButton.style.display = "block";
})


let startButton = document.getElementById('start_button');
let stopButton = document.getElementById('stop_button');
startButton.addEventListener('click', onStartPressed);
stopButton.addEventListener('click', onStopPressed);

function onStartPressed() {
  socket.emit('sound');
}

function onStopPressed() {
  socket.emit('stop');
}






