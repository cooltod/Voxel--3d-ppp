// --- Basic Three.js Setup ---
const scene = new THREE.Scene();
const container = document.getElementById('game-canvas-container');
const infoElement = document.getElementById('info');
const clock = new THREE.Clock(); // Clock for delta time (frame rate independence)

// Camera, Renderer, Lighting setup remains the same...
// ... (Copy from previous main.js) ...
const aspectRatio = window.innerWidth / window.innerHeight;
const gameWidth = 20;
const gameHeight = gameWidth / aspectRatio;
const camera = new THREE.OrthographicCamera(
    -gameWidth / 2, gameWidth / 2,
    gameHeight / 2, -gameHeight / 2,
    0.1, 100
);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x111111);
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- Asset Loaders & SFX/Textures holders ---
// ... (Copy textureLoader, audioListener, audioLoader, sfx, textures setup from previous main.js) ...
const textureLoader = new THREE.TextureLoader();
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const audioLoader = new THREE.AudioLoader();
const sfx = { hit: null, wall: null, score: null, stageUp: null };
const textures = { bgGrid: null, bgSpace: null, bgCircuit: null, ballMetal: null, ballFire: null };
let assetsLoaded = false;
let assetsToLoad = 8; // Adjust if you changed asset count
let assetsLoadedCount = 0;

function assetLoadedCallback(assetType) {
    // ... (Copy assetLoadedCallback logic from previous main.js) ...
    assetsLoadedCount++;
    console.log(`${assetType} loaded (${assetsLoadedCount}/${assetsToLoad})`);
    if (assetsLoadedCount === assetsToLoad) {
        console.log("All assets loaded!");
        assetsLoaded = true;
        infoElement.textContent = "Ready!";
        createStartButton();
    } else {
         infoElement.textContent = `Loading ${assetType}... (${assetsLoadedCount}/${assetsToLoad})`;
    }
}

function loadAssets() {
     // ... (Copy the entire loadAssets function content from previous main.js) ...
    infoElement.textContent = "Loading assets...";

    // Textures
    textureLoader.load('assets/textures/grid_bg.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
        textures.bgGrid = texture; assetLoadedCallback('Grid BG');
    }, undefined, (err) => console.error('Error loading grid_bg.png', err));

    textureLoader.load('assets/textures/space_bg.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
        textures.bgSpace = texture; assetLoadedCallback('Space BG');
    }, undefined, (err) => console.error('Error loading space_bg.png', err));

     textureLoader.load('assets/textures/circuit_bg.png', (texture) => {
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
        textures.bgCircuit = texture; assetLoadedCallback('Circuit BG');
    }, undefined, (err) => console.error('Error loading circuit_bg.png', err));

    textureLoader.load('assets/textures/metal_ball.png', (texture) => {
        texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
        textures.ballMetal = texture; assetLoadedCallback('Metal Ball Texture');
    }, undefined, (err) => console.error('Error loading metal_ball.png', err));

    textureLoader.load('assets/textures/fire_ball.png', (texture) => {
        texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
        textures.ballFire = texture; assetLoadedCallback('Fire Ball Texture');
    }, undefined, (err) => console.error('Error loading fire_ball.png', err));


    // Sounds
    audioLoader.load('assets/audio/hit.wav', (buffer) => {
        sfx.hit = new THREE.Audio(audioListener).setBuffer(buffer);
        sfx.hit.setVolume(0.7); assetLoadedCallback('Hit SFX');
    }, undefined, (err) => console.error('Error loading hit.wav', err));

    audioLoader.load('assets/audio/wall.wav', (buffer) => {
        sfx.wall = new THREE.Audio(audioListener).setBuffer(buffer);
        sfx.wall.setVolume(0.6); assetLoadedCallback('Wall SFX');
    }, undefined, (err) => console.error('Error loading wall.wav', err));

    audioLoader.load('assets/audio/score.wav', (buffer) => {
        sfx.score = new THREE.Audio(audioListener).setBuffer(buffer);
        sfx.score.setVolume(0.8); assetLoadedCallback('Score SFX');
    }, undefined, (err) => console.error('Error loading score.wav', err));

    audioLoader.load('assets/audio/stage_up.wav', (buffer) => {
        sfx.stageUp = new THREE.Audio(audioListener).setBuffer(buffer);
        sfx.stageUp.setVolume(0.9); assetLoadedCallback('StageUp SFX');
    }, undefined, (err) => console.error('Error loading stage_up.wav', err));
}

// --- Stages Definition ---
// ... (Copy stages array definition from previous main.js) ...
const stages = [
    { scoreToReach: 0, background: textures.bgGrid, ballTexture: null, ballColor: 0xffffff, aiSpeedMultiplier: 1.0, ballSpeedMultiplier: 1.0 },
    { scoreToReach: 3, background: textures.bgSpace, ballTexture: textures.ballMetal, ballColor: 0xffffff, aiSpeedMultiplier: 1.1, ballSpeedMultiplier: 1.1 },
    { scoreToReach: 7, background: textures.bgCircuit, ballTexture: textures.ballFire, ballColor: 0xffa500, aiSpeedMultiplier: 1.25, ballSpeedMultiplier: 1.2 }
];
let currentStageIndex = 0;

// --- Game Elements ---
// ... (Copy paddle/ball geometry, materials, mesh creation from previous main.js) ...
const paddleWidth = 0.5;
const paddleHeight = gameHeight * 0.2;
const paddleDepth = 0.5;
const ballSize = 0.4;
const paddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
const ballGeometry = new THREE.BoxGeometry(ballSize, ballSize, ballSize);
const playerPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00dd00 });
const aiPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0xdd0000 });
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const playerPaddle = new THREE.Mesh(paddleGeometry, playerPaddleMaterial);
playerPaddle.position.x = -gameWidth / 2 + paddleWidth * 1.5;
scene.add(playerPaddle);
const aiPaddle = new THREE.Mesh(paddleGeometry, aiPaddleMaterial);
aiPaddle.position.x = gameWidth / 2 - paddleWidth * 1.5;
scene.add(aiPaddle);
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

// --- Game State ---
// ... (Copy score vars, speed vars, velocity from previous main.js) ...
let gameRunning = false;
let playerScore = 0;
let aiScore = 0;
const playerScoreElement = document.getElementById('player-score');
const aiScoreElement = document.getElementById('ai-score');
const baseBallSpeed = gameWidth * 0.006;
const baseAiSpeed = gameHeight * 0.06;
let currentBallSpeed = baseBallSpeed;
let currentAiSpeed = baseAiSpeed;
let ballVelocity = new THREE.Vector2(0, 0);
let ballWaitingToLaunch = false; // *** NEW ***
const playerPaddleSpeed = gameHeight * 0.8; // *** NEW: Speed factor for joystick control ***

// --- NEW: Joystick State and Elements ---
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
let joystickStartY = 0;
let joystickCurrentY = 0;
let joystickValueY = 0; // Normalized value (-1 to 1)
const joystickRadius = joystickBase.offsetWidth / 2; // Radius of the base for clamping
const knobRadius = joystickKnob.offsetWidth / 2;
const maxKnobOffset = joystickRadius - knobRadius;

// --- NEW: Launch Button Element ---
const launchButton = document.getElementById('launch-button');

// --- Game Boundaries ---
// ... (Copy boundary definitions from previous main.js) ...
const boundaryTop = gameHeight / 2 - ballSize / 2;
const boundaryBottom = -gameHeight / 2 + ballSize / 2;
const boundaryLeft = -gameWidth / 2;
const boundaryRight = gameWidth / 2;

// --- SFX Player Function ---
// ... (Copy playSound function from previous main.js) ...
function playSound(sound) {
    if (sound && sound.isPlaying) {
        sound.stop();
    }
    if (sound) {
        sound.play();
    }
}

// --- Apply Stage Settings ---
// ... (Copy applyStageSettings function from previous main.js) ...
// Ensure textures are assigned correctly based on the loaded texture references
function applyStageSettings(stageIndex) {
    if (stageIndex < 0 || stageIndex >= stages.length) return;
    const stage = stages[stageIndex];
    console.log(`Applying settings for Stage ${stageIndex}`);

    // Background
    const bgTexture = stageIndex === 0 ? textures.bgGrid : (stageIndex === 1 ? textures.bgSpace : textures.bgCircuit);
    if (bgTexture instanceof THREE.Texture) {
        scene.background = bgTexture;
        const bgAspect = bgTexture.image ? (bgTexture.image.width / bgTexture.image.height) : 1;
        bgTexture.repeat.set(gameWidth / (gameHeight * bgAspect) , gameWidth / gameHeight);
    } else { scene.background = new THREE.Color(0x111111); }

    // Ball Appearance
     const ballTex = stageIndex === 1 ? textures.ballMetal : (stageIndex === 2 ? textures.ballFire : null);
    if (ballTex instanceof THREE.Texture) {
        ball.material.map = ballTex;
        ball.material.color.setHex(0xffffff);
    } else {
        ball.material.map = null;
        ball.material.color.setHex(stage.ballColor || 0xffffff);
    }
    ball.material.needsUpdate = true;

    // Speeds
    currentBallSpeed = baseBallSpeed * (stage.ballSpeedMultiplier || 1.0);
    currentAiSpeed = baseAiSpeed * (stage.aiSpeedMultiplier || 1.0);

    if (stageIndex > 0) { playSound(sfx.stageUp); }
}

// --- Reset Ball Function (Modified) ---
function resetBall(serveDirection = 1) {
    ball.position.set(0, 0, 0);
    ballVelocity.set(0, 0); // Stop the ball
    ballWaitingToLaunch = true; // Set flag
    launchButton.style.display = 'block'; // Show launch button
    launchButton.dataset.serveDirection = serveDirection; // Store serve direction
    console.log("Ball reset, waiting for launch.");
}

// --- NEW: Launch Ball Function ---
function launchBall() {
    if (!ballWaitingToLaunch || !gameRunning) return;

    const serveDirection = parseInt(launchButton.dataset.serveDirection || '1');
    let angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30 to +30 deg

    ballVelocity.set(
        Math.cos(angle) * currentBallSpeed * serveDirection,
        Math.sin(angle) * currentBallSpeed
    );

    ballWaitingToLaunch = false;
    launchButton.style.display = 'none'; // Hide button
    console.log("Ball launched. Speed:", currentBallSpeed);
}

// --- Update AI Paddle ---
// ... (Copy updateAI function from previous main.js) ...
function updateAI() {
    const targetY = ball.position.y;
    const halfPaddleH = paddleHeight / 2;
    const maxY = gameHeight / 2 - halfPaddleH;
    const minY = -gameHeight / 2 + halfPaddleH;
    let diff = targetY - aiPaddle.position.y;
    diff = Math.max(-currentAiSpeed, Math.min(currentAiSpeed, diff));
    aiPaddle.position.y += diff * 0.1;
    aiPaddle.position.y = Math.max(minY, Math.min(maxY, aiPaddle.position.y));
}

// --- Check Stage Progression ---
// ... (Copy checkStageProgression function from previous main.js) ...
function checkStageProgression() {
    if (currentStageIndex + 1 < stages.length) {
        const nextStage = stages[currentStageIndex + 1];
        if (playerScore >= nextStage.scoreToReach || aiScore >= nextStage.scoreToReach) {
            currentStageIndex++;
            applyStageSettings(currentStageIndex);
        }
    }
}

// --- Collision Detection ---
// ... (Copy checkCollisions function from previous main.js, ensure it calls resetBall) ...
function checkCollisions() {
    // Ball vs Top/Bottom Walls
    if (ball.position.y >= boundaryTop || ball.position.y <= boundaryBottom) {
        ballVelocity.y *= -1;
        ball.position.y = Math.sign(ball.position.y) * boundaryTop;
        playSound(sfx.wall);
    }

    // Ball vs Paddles
    const halfPaddleW = paddleWidth / 2;
    const halfPaddleH = paddleHeight / 2;
    const halfBallSize = ballSize / 2;

    // Player Paddle
    if (ball.position.x - halfBallSize < playerPaddle.position.x + halfPaddleW && /* ... rest of condition */ ballVelocity.x < 0)
    {
        ballVelocity.x *= -1.0;
        let hitPos = (ball.position.y - playerPaddle.position.y) / halfPaddleH;
        ballVelocity.y += hitPos * currentBallSpeed * 0.7;
        ballVelocity.clampLength(0, currentBallSpeed * 1.5);
        ball.position.x = playerPaddle.position.x + halfPaddleW + halfBallSize + 0.01;
        playSound(sfx.hit);
    }

    // AI Paddle
    if (ball.position.x + halfBallSize > aiPaddle.position.x - halfPaddleW && /* ... rest of condition */ ballVelocity.x > 0)
    {
        ballVelocity.x *= -1.0;
         let hitPos = (ball.position.y - aiPaddle.position.y) / halfPaddleH;
         ballVelocity.y += hitPos * currentBallSpeed * 0.7;
         ballVelocity.clampLength(0, currentBallSpeed * 1.5);
        ball.position.x = aiPaddle.position.x - halfPaddleW - halfBallSize - 0.01;
        playSound(sfx.hit);
    }

    // Scoring
    if (ball.position.x < boundaryLeft) {
        aiScore++;
        aiScoreElement.textContent = aiScore;
        playSound(sfx.score);
        checkStageProgression();
        resetBall(1); // Serve to player -> Show Launch Button
    } else if (ball.position.x > boundaryRight) {
        playerScore++;
        playerScoreElement.textContent = playerScore;
        playSound(sfx.score);
        checkStageProgression();
        resetBall(-1); // Serve to AI -> Show Launch Button
    }
}

// --- NEW: Joystick Event Handlers ---
function handleJoystickTouchStart(event) {
    event.preventDefault(); // Prevent scrolling/zooming
    if (event.target === joystickKnob || event.target === joystickBase) {
        joystickActive = true;
        const touch = event.touches[0];
        joystickStartY = touch.clientY; // Record initial Y touch position
        joystickCurrentY = joystickStartY;
        joystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Highlight knob
    }
}

function handleJoystickTouchMove(event) {
    if (!joystickActive) return;
    event.preventDefault();

    const touch = event.touches[0];
    joystickCurrentY = touch.clientY;

    let deltaY = joystickCurrentY - joystickStartY;

    // Calculate knob visual position (optional, but good feedback)
    // This part moves the knob visually based on total movement from center
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let knobX = touch.clientX - centerX;
    let knobY = touch.clientY - centerY;
    const distance = Math.sqrt(knobX * knobX + knobY * knobY);

    if (distance > maxKnobOffset) {
        const ratio = maxKnobOffset / distance;
        knobX *= ratio;
        knobY *= ratio;
    }
    // Update visual knob position relative to base center
    joystickKnob.style.transform = `translate(-50%, -50%) translate(${knobX}px, ${knobY}px)`;


    // --- Calculate Joystick Value ---
    // Use the vertical component clamped by the max offset
    // Invert because screen Y is opposite to game Y
    joystickValueY = -knobY / maxKnobOffset;
    joystickValueY = Math.max(-1, Math.min(1, joystickValueY)); // Clamp to -1, 1
}

function handleJoystickTouchEnd(event) {
    if (joystickActive) {
        joystickActive = false;
        joystickValueY = 0; // Reset value when touch ends
        // Reset visual knob position
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickKnob.style.backgroundColor = 'rgba(200, 200, 200, 0.7)'; // Reset knob color
    }
}

// --- Animation Loop (Modified) ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta(); // Get time since last frame

    if (gameRunning && assetsLoaded) {
        // --- NEW: Update Player Paddle from Joystick ---
        const halfPaddleH = paddleHeight / 2;
        const maxY = gameHeight / 2 - halfPaddleH;
        const minY = -gameHeight / 2 + halfPaddleH;

        // Calculate potential new position based on joystick value and delta time
        let newY = playerPaddle.position.y + joystickValueY * playerPaddleSpeed * deltaTime;

        // Clamp position within boundaries
        playerPaddle.position.y = Math.max(minY, Math.min(maxY, newY));

        // --- Update AI ---
        updateAI();

        // --- Update Ball (only if not waiting) ---
        if (!ballWaitingToLaunch) {
            ball.position.x += ballVelocity.x * (deltaTime * 60); // Multiply by 60 if speeds were tuned to assume 60fps
            ball.position.y += ballVelocity.y * (deltaTime * 60); // Adjust this multiplier if needed
            checkCollisions();
        }
    }

    renderer.render(scene, camera);
}


// --- Handle Window Resize ---
// ... (Copy onWindowResize function from previous main.js, ensure it handles background repeat) ...
function onWindowResize() {
    const newAspectRatio = window.innerWidth / window.innerHeight;
    const newGameHeight = gameWidth / newAspectRatio;

    camera.left = -gameWidth / 2; camera.right = gameWidth / 2;
    camera.top = newGameHeight / 2; camera.bottom = -newGameHeight / 2;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (scene.background instanceof THREE.Texture && scene.background.image) {
         const bgAspect = scene.background.image.width / scene.background.image.height;
         scene.background.repeat.set(gameWidth / (newGameHeight * bgAspect), gameWidth / newGameHeight);
    }
    // Note: Joystick size/position is fixed in CSS, resize doesn't affect it here
}
window.addEventListener('resize', onWindowResize);

// --- Start Button ---
// ... (Copy createStartButton function from previous main.js) ...
function createStartButton() {
    const button = document.createElement('button');
    button.id = 'start-button'; button.textContent = 'START';
    // Styling... (copy from previous)
    button.style.position = 'absolute'; button.style.top = '50%'; button.style.left = '50%';
    button.style.transform = 'translate(-50%, -50%)'; button.style.padding = '20px 40px';
    button.style.fontSize = '2em'; button.style.backgroundColor = '#4CAF50'; button.style.color = 'white';
    button.style.border = 'none'; button.style.borderRadius = '10px'; button.style.cursor = 'pointer';
    button.style.zIndex = '30';

    button.onclick = () => {
        if (!assetsLoaded) return;
        // User interaction required to start audio context
        if (audioListener.context.state === 'suspended') {
            audioListener.context.resume();
        }
        document.body.removeChild(button);
        infoElement.style.display = 'none';
        startGame();
    };
    document.body.appendChild(button);
}


// --- Start Game Function (Modified) ---
function startGame() {
    if (gameRunning) return;
     console.log("Starting game...");
    gameRunning = true;
    playerScore = 0;
    aiScore = 0;
    playerScoreElement.textContent = playerScore;
    aiScoreElement.textContent = aiScore;
    currentStageIndex = -1;

    // Hide start-related UI potentially shown before
    launchButton.style.display = 'none';

    // Apply initial stage settings and reset/s
