let handPose;
let video;
let hands = [];
let pg; 

// === Array para las chispas ===
let particles = [];

let osc;
let isOn = false;
let audioStarted = false;

// VARIABLES DE SONIDO
let noise, boomEnv, boomFilter;
let subOsc, subEnv;

let boomSize = 0;
let boomMax = 300;
let boomX = 0;
let boomY = 0;

// === TAMAÑO DEL VIDEO ===
let videoOriginalW = 640;
let videoOriginalH = 480;
let escala = 1.5; 

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // === NUEVO: BLOQUEAR SCROLL Y BARRAS LATERALES ===
  // Esto inyecta estilos CSS directamente al cuerpo de la página
  document.body.style.overflow = "hidden"; // Quita las barras de desplazamiento
  document.body.style.margin = "0";      // Quita los bordes blancos por defecto
  document.body.style.padding = "0";
  // =================================================

  // Gráfico pequeño para el fondo borroso
  pg = createGraphics(320, 240); 

  video = createCapture(VIDEO);
  video.size(videoOriginalW, videoOriginalH);
  video.hide();

  handPose.detectStart(video, gotHands);

  osc = new p5.Oscillator("sine");
  osc.start();
  osc.amp(0);

  setupBoomSound();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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

function mousePressed() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
    console.log("Audio iniciado");
  }
}

function draw() {
  background(0);

  // === FONDO BORROSO ===
  pg.image(video, 0, 0, pg.width, pg.height);
  pg.filter(BLUR, 3); 
  
  push();
  tint(200, 100); 
  image(pg, 0, 0, width, height);
  pop();


  // === VIDEO PRINCIPAL (ESCALADO) ===
  let anchoFinal = videoOriginalW * escala;
  let altoFinal = videoOriginalH * escala;
  let x = (width - anchoFinal) / 2;
  let y = (height - altoFinal) / 2;

  noFill();
  stroke(255);
  strokeWeight(2);
  rect(x, y, anchoFinal, altoFinal);

  // === TRANSFORMACIÓN MÁGICA ===
  push();
  translate(x, y); 
  scale(escala);   
  
    noTint();
    image(video, 0, 0);

    // --- LOGICA BOOM VISUAL ---
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
        // Zona Amarilla -> Blanca
        let nt = map(tcol, 0.66, 1, 0, 1);
        col = lerpColor(amarillo, blanco, nt);

        // === GATILLO DE PARTÍCULAS ===
        if (tcol > 0.95) {
            for(let i = 0; i < 5; i++) {
                particles.push(new Particle(cx, cy));
            }
        }
      }

      fill(col);
      noStroke();
      circle(cx, cy, pinch);

      // === DIBUJAR LAS PARTÍCULAS ===
      for (let i = particles.length - 1; i >= 0; i--) {
          let p = particles[i];
          p.update();
          p.display();
          if (p.isDead()) {
              particles.splice(i, 1);
          }
      }

      // Sonido
      let freq = map(pinch, 20, 250, 200, 4000);
      osc.freq(freq);

      if (!isOn) {
        osc.amp(0.3, 0.1);
        isOn = true;
      }

      if (freq > 3600) {
        triggerBoom(cx, cy);
      }

    } else {
      if (isOn) {
        osc.amp(0, 0.1);
        isOn = false;
      }
    }
  
  pop(); // Fin de la transformación

  if (!audioStarted) {
    fill(255);
    noStroke();
    textSize(32);
    textAlign(CENTER);
    text('Haz CLICK para activar sonido', width / 2, height / 2);
  }
}

function triggerBoom(cx, cy) {
  if (!audioStarted) return; 
  osc.amp(0, 0.05);
  boomSize = boomMax;
  boomX = cx;
  boomY = cy;
  boomFilter.freq(100000);
  boomEnv.play(noise);
  subEnv.play(subOsc);
}

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

// === CLASE PARTÍCULA ===
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(8, 18)); 
    
    this.alpha = 255;
    this.w = random(4, 8); 
    this.lenFactor = random(0.8, 1.5); 
  }

  update() {
    this.pos.add(this.vel);
    this.alpha -= 12; 
  }

  display() {
    stroke(255, this.alpha);
    strokeWeight(this.w);
    line(
      this.pos.x, 
      this.pos.y, 
      this.pos.x - this.vel.x * this.lenFactor, 
      this.pos.y - this.vel.y * this.lenFactor
    );
  }

  isDead() {
    return this.alpha < 0;
  }
}