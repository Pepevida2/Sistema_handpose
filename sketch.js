let handPose;
let video;
let hands = [];

let osc;
let isOn = false;
let audioStarted = false; // NUEVO: Para saber si el audio ya arrancó

// BOOM
let noise, boomEnv, boomFilter;
let subOsc, subEnv;

// Para el boom animado
let boomSize = 0;
let boomMax = 300;
let boomX = 0;
let boomY = 0;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  osc = new p5.Oscillator("sine");
  osc.start();
  osc.amp(0);

  setupBoomSound();
}

function setupBoomSound() {
  noise = new p5.Noise("white");
  noise.amp(0);
  noise.start();

  boomFilter = new p5.LowPass();
  noise.disconnect();
  noise.connect(boomFilter);

  boomEnv = new p5.Envelope();
  boomEnv.setADSR(0.001, 0.15, 0, 0.15);
  boomEnv.setRange(2.2, 0);

  subOsc = new p5.Oscillator("sine");
  subOsc.freq(60);
  subOsc.amp(0);
  subOsc.start();

  subEnv = new p5.Envelope();
  subEnv.setADSR(0.001, 0.2, 0, 0.25);
  subEnv.setRange(2, 0);
}

// NUEVO: Esta función desbloquea el audio del navegador
function mousePressed() {
  if (!audioStarted) {
    userStartAudio(); // Función nativa de p5.sound para iniciar el contexto de audio
    audioStarted = true;
    console.log("Audio iniciado por el usuario");
  }
}

function draw() {
  image(video, 0, 0, width, height);

  // NUEVO: Texto de instrucción si no han hecho click
  if (!audioStarted) {
    fill(255);
    textSize(32);
    textAlign(CENTER);
    text('Haz CLICK en la pantalla para activar el sonido', width / 2, height / 2);
  }

  // BOOM animación
  if (boomSize > 0) {
    drawBoomCircle();
    boomSize -= 8;
    if (boomSize < 0) boomSize = 0;
  }

  if (hands.length > 0) {

    let f = hands[0].index_finger_tip;
    let t = hands[0].thumb_tip;

    let pinch = dist(f.x, f.y, t.x, t.y);

    let cx = (f.x + t.x) / 2;
    let cy = (f.y + t.y) / 2;

    // ======= NUEVO: DEGRADADO BASADO EN PINCH =======
    let rojo = color(255, 0, 0);
    let naranja = color(255, 140, 0);
    let amarillo = color(255, 255, 0);
    let blanco = color(255);

    let tcol = constrain(map(pinch, 20, 250, 0, 1), 0, 1);
    let col;

    if (tcol < 0.33) {
      let nt = map(tcol, 0, 0.33, 0, 1);
      col = lerpColor(rojo, naranja, nt);

    } else if (tcol < 0.66) {
      let nt = map(tcol, 0.33, 0.66, 0, 1);
      col = lerpColor(naranja, amarillo, nt);

    } else {
      let nt = map(tcol, 0.66, 1, 0, 1);
      col = lerpColor(amarillo, blanco, nt);
    }

    fill(col);
    noStroke();
    circle(cx, cy, pinch);

    // sonido normal
    let freq = map(pinch, 20, 250, 200, 4000);
    osc.freq(freq);

    if (!isOn) {
      osc.amp(0.3, 0.1);
      isOn = true;
    }

    // Trigger BOOM a cierto punto
    if (freq > 3600) {
      triggerBoom(cx, cy);
    }

  } else {
    if (isOn) {
      osc.amp(0, 0.1);
      isOn = false;
    }
  }
}

function triggerBoom(cx, cy) {
  // Solo suena si el usuario ya interactuó
  if (!audioStarted) return; 

  console.log("BOOM!");

  osc.amp(0, 0.05);

  boomSize = boomMax;
  boomX = cx;
  boomY = cy;

  boomFilter.freq(100000);
  boomEnv.play(noise);

  subEnv.play(subOsc);
}

// círculo del boom
function drawBoomCircle() {

  let rojo = color(255, 0, 0);
  let naranja = color(255, 140, 0);
  let amarillo = color(255, 255, 0);
  let blanco = color(255);

  let t = boomSize / boomMax;
  let col;

  if (t < 0.33) {
    let nt = map(t, 0, 0.33, 0, 1);
    col = lerpColor(rojo, naranja, nt);

  } else if (t < 0.66) {
    let nt = map(t, 0.33, 0.66, 0, 1);
    col = lerpColor(naranja, amarillo, nt);

  } else {
    let nt = map(t, 0.66, 1, 0, 1);
    col = lerpColor(amarillo, blanco, nt);
  }

  fill(col);
  noStroke();
  ellipse(boomX, boomY, boomSize);
}

function gotHands(results) {
  hands = results;
}