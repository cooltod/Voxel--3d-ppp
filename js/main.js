// Constants
const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 16;
const PADDLE_SPEED = 450; // Player paddle speed
const BASE_AI_PADDLE_SPEED = 250; // Base AI speed
const BASE_BALL_SPEED = 300;    // Base ball speed magnitude

// Stages Definition (Using asset keys defined in preload)
const stages = [
    { scoreToReach: 0, bgKey: 'bgGrid', ballKey: 'ballDefault', aiSpeedMultiplier: 1.0, ballSpeedMultiplier: 1.0 },
    { scoreToReach: 3, bgKey: 'bgSpace', ballKey: 'ballMetal', aiSpeedMultiplier: 1.1, ballSpeedMultiplier: 1.1 },
    { scoreToReach: 7, bgKey: 'bgCircuit', ballKey: 'ballFire', aiSpeedMultiplier: 1.25, ballSpeedMultiplier: 1.2 }
    // Add more stages here...
];

// Phaser Game Scene
class PlayScene extends Phaser.Scene {
    constructor() {
        super('playGame'); // Scene key

        // Game objects
        this.playerPaddle = null;
        this.aiPaddle = null;
        this.ball = null;
        this.background = null;

        // UI Elements (HTML Overlays)
        this.playerScoreText = null;
        this.aiScoreText = null;
        this.infoText = null;
        this.joystickContainer = null;
        this.joystickKnob = null;
        this.launchButton = null;

        // Game state
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentStageIndex = 0;
        this.currentAiSpeed = BASE_AI_PADDLE_SPEED;
        this.currentBallSpeed = BASE_BALL_SPEED;
        this.ballWaitingToLaunch = false;
        this.serveDirection = 1; // 1 for player, -1 for AI
        this.gameRunning = false;

        // Joystick state
        this.joystickActive = false;
        this.joystickStartY = 0;
        this.joystickCurrentY = 0;
        this.joystickValueY = 0; // -1 to 1
        this.joystickBaseRect = null; // To store bounding box
        this.maxKnobOffset = 0; // Calculated in create

        // Sounds
        this.sfx = {};
    }

    preload() {
        this.infoText = document.getElementById('info');
        this.infoText.textContent = 'Loading Assets...';

        // Load Textures
        this.load.image('bgGrid', 'assets/textures/grid_bg.png');
        this.load.image('bgSpace', 'assets/textures/space_bg.png');
        this.load.image('bgCircuit', 'assets/textures/circuit_bg.png');
        this.load.image('paddle', 'assets/textures/paddle.png');
        // Load ball textures - using spritesheets allows potential animation later
        this.load.spritesheet('ballDefault', 'assets/textures/paddle.png', { frameWidth: BALL_SIZE, frameHeight: BALL_SIZE }); // Placeholder: use paddle as simple square ball if no specific default ball texture
        this.load.spritesheet('ballMetal', 'assets/textures/metal_ball.png', { frameWidth: 16, frameHeight: 16 }); // Assuming 16x16
        this.load.spritesheet('ballFire', 'assets/textures/fire_ball.png', { frameWidth: 16, frameHeight: 16 });  // Assuming 16x16

        // Load Audio
        this.load.audio('hit', 'assets/audio/hit.wav');
        this.load.audio('wall', 'assets/audio/wall.wav');
        this.load.audio('score', 'assets/audio/score.wav');
        this.load.audio('stageUp', 'assets/audio/stage_up.wav');
        this.load.audio('uiClick', 'assets/audio/ui_click.wav'); // If needed later
        this.load.audio('launchPress', 'assets/audio/launch_press.wav');
        this.load.audio('startGame', 'assets/audio/start_game.wav');

        this.load.on('complete', () => {
            this.infoText.textContent = 'Ready!';
            this.createStartButton(); // Create Phaser start button now
        });
    }

    create() {
        // --- Setup World & Physics ---
        this.physics.world.setBoundsCollision(false, false, true, true); // Collide top/bottom only

        // --- Get Screen Dimensions ---
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        // --- Background ---
        this.background = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'bgGrid')
            .setOrigin(0, 0)
            .setScrollFactor(0); // Important if camera moved, good practice

        // --- Paddles ---
        // Player Paddle (Left)
        this.playerPaddle = this.physics.add.sprite(PADDLE_WIDTH * 2, gameHeight / 2, 'paddle')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(PADDLE_WIDTH, PADDLE_HEIGHT)
            .setImmovable(true) // Ball bounces off
            .setCollideWorldBounds(true);
        this.playerPaddle.body.onWorldBounds = true; // Enable world bounds collision event if needed

        // AI Paddle (Right)
        this.aiPaddle = this.physics.add.sprite(gameWidth - (PADDLE_WIDTH * 2), gameHeight / 2, 'paddle')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(PADDLE_WIDTH, PADDLE_HEIGHT)
            .setImmovable(true)
            .setCollideWorldBounds(true);
        this.aiPaddle.body.onWorldBounds = true;

        // --- Ball ---
        this.ball = this.physics.add.sprite(gameWidth / 2, gameHeight / 2, 'ballDefault') // Start with default texture key
             .setOrigin(0.5, 0.5)
             .setDisplaySize(BALL_SIZE, BALL_SIZE)
             .setCollideWorldBounds(true) // Use world bounds for top/bottom walls
             .setBounce(1, 1); // Full bounce
        this.ball.body.onWorldBounds = true; // Trigger event on hitting top/bottom

        // --- Collisions ---
        this.physics.add.collider(this.ball, this.playerPaddle, this.hitPaddle, null, this);
        this.physics.add.collider(this.ball, this.aiPaddle, this.hitPaddle, null, this);

        // Handle top/bottom wall collision sound
        this.physics.world.on('worldbounds', (body, up, down, left, right) => {
            if ((up || down) && body.gameObject === this.ball) {
                this.playSound('wall');
            }
        }, this);


        // --- Sounds ---
        this.sfx.hit = this.sound.add('hit', { volume: 0.7 });
        this.sfx.wall = this.sound.add('wall', { volume: 0.6 });
        this.sfx.score = this.sound.add('score', { volume: 0.8 });
        this.sfx.stageUp = this.sound.add('stageUp', { volume: 0.9 });
        this.sfx.launchPress = this.sound.add('launchPress', { volume: 0.7 });
        this.sfx.startGame = this.sound.add('startGame', { volume: 0.8 });
        // this.sfx.uiClick = this.sound.add('uiClick', { volume: 0.5 });


        // --- UI Elements (HTML References) ---
        this.playerScoreText = document.getElementById('player-score');
        this.aiScoreText = document.getElementById('ai-score');
        // Info text already referenced in preload
        this.joystickContainer = document.getElementById('joystick-container');
        this.joystickKnob = document.getElementById('joystick-knob');
        this.launchButton = document.getElementById('launch-button');

        // --- Joystick Setup ---
        this.joystickContainer.addEventListener('touchstart', this.handleJoystickTouchStart.bind(this), { passive: false });
        this.joystickContainer.addEventListener('touchmove', this.handleJoystickTouchMove.bind(this), { passive: false });
        this.joystickContainer.addEventListener('touchend', this.handleJoystickTouchEnd.bind(this));
        this.joystickContainer.addEventListener('touchcancel', this.handleJoystickTouchEnd.bind(this));
        // Calculate joystick visual parameters
        // Wait a frame for CSS layout to potentially settle? Or use fixed values.
        setTimeout(() => { // Use timeout as a simple way to wait for potential layout shifts
            this.joystickBaseRect = this.joystickContainer.getBoundingClientRect();
            const baseRadius = this.joystickContainer.offsetWidth / 2;
            const knobRadius = this.joystickKnob.offsetWidth / 2;
            this.maxKnobOffset = baseRadius - knobRadius;
        }, 100);


        // --- Launch Button Setup ---
        this.launchButton.addEventListener('touchstart', (event) => {
            event.preventDefault();
            if (this.ballWaitingToLaunch && this.gameRunning) {
                this.playSound('launchPress');
                this.launchBall();
            }
        }, { passive: false });
        // Fallback click for desktop testing
         this.launchButton.addEventListener('click', () => {
             if (this.ballWaitingToLaunch && this.gameRunning) {
                 this.playSound('launchPress');
                 this.launchBall();
             }
         });

        // --- Initial Game State ---
        this.applyStageSettings(this.currentStageIndex); // Apply stage 0 settings
        // Don't start game automatically, wait for start button
    }

    // --- Create Start Button (Using Phaser Text) ---
    createStartButton() {
         const gameWidth = this.scale.width;
         const gameHeight = this.scale.height;

         const startButton = this.add.text(gameWidth / 2, gameHeight / 2, 'START', {
             fontFamily: '"Press Start 2P"', // Ensure quotes if font name has spaces
             fontSize: '32px', // Adjust size
             color: '#ffffff',
             backgroundColor: '#4CAF50',
             padding: { x: 20, y: 10 }
         })
         .setOrigin(0.5)
         .setDepth(100) // Ensure it's on top
         .setInteractive({ useHandCursor: true });

         startButton.on('pointerdown', () => {
            // Resume audio context if needed (important for browsers)
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            this.playSound('startGame');
            startButton.destroy(); // Remove the button
            this.infoText.style.display = 'none'; // Hide info text
            this.startGame();
         });
    }


    // --- Start Game Logic ---
    startGame() {
        if (this.gameRunning) return;
        console.log("Starting game...");

        this.playerScore = 0;
        this.aiScore = 0;
        this.playerScoreText.textContent = this.playerScore;
        this.aiScoreText.textContent = this.aiScore;
        this.currentStageIndex = 0; // Reset stage
        this.applyStageSettings(this.currentStageIndex); // Apply stage 0 settings

        this.gameRunning = true;
        this.joystickContainer.style.display = 'flex'; // Show joystick

        this.resetBall(Math.random() > 0.5 ? 1 : -1); // Setup first serve
    }

    // --- Game Loop ---
    update(time, delta) {
        if (!this.gameRunning) return;

        this.updatePlayerPaddle(delta);
        this.updateAIPaddle(delta);
        this.checkGoal(); // Check if ball passed paddles for scoring
    }

    // --- Player Paddle Control ---
    updatePlayerPaddle(delta) {
        const targetVelocityY = this.joystickValueY * PADDLE_SPEED;
        this.playerPaddle.setVelocityY(targetVelocityY);

        // Clamp position manually - Phaser's setCollideWorldBounds stops it but doesn't clamp smoothly
        const halfPaddleHeight = this.playerPaddle.displayHeight / 2;
        this.playerPaddle.y = Phaser.Math.Clamp(
            this.playerPaddle.y,
            halfPaddleHeight,
            this.scale.height - halfPaddleHeight
        );
    }

    // --- AI Paddle Control ---
    updateAIPaddle(delta) {
        const ballY = this.ball.y;
        const paddleY = this.aiPaddle.y;
        const diff = ballY - paddleY;

        let targetVelocityY = 0;
        if (Math.abs(diff) > 5) { // Add a small dead zone
            targetVelocityY = Math.sign(diff) * this.currentAiSpeed;
        }

        // Limit AI speed
        this.aiPaddle.setVelocityY(targetVelocityY);

        // Clamp position
        const halfPaddleHeight = this.aiPaddle.displayHeight / 2;
        this.aiPaddle.y = Phaser.Math.Clamp(
            this.aiPaddle.y,
            halfPaddleHeight,
            this.scale.height - halfPaddleHeight
        );
    }

    // --- Ball Handling ---
    resetBall(serveDirection = 1) {
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;

        this.ball.setPosition(gameWidth / 2, gameHeight / 2);
        this.ball.setVelocity(0, 0);
        this.ballWaitingToLaunch = true;
        this.serveDirection = serveDirection;
        this.launchButton.style.display = 'block'; // Show HTML launch button
        console.log("Ball reset, waiting for launch.");
    }

    launchBall() {
        if (!this.ballWaitingToLaunch) return;

        const angleVariation = Phaser.Math.Between(-15, 15); // Degrees
        const angle = Phaser.Math.DegToRad(angleVariation);

        const speedX = this.currentBallSpeed * Math.cos(angle) * this.serveDirection;
        const speedY = this.currentBallSpeed * Math.sin(angle);

        this.ball.setVelocity(speedX, speedY);
        this.ballWaitingToLaunch = false;
        this.launchButton.style.display = 'none'; // Hide HTML launch button
        console.log("Ball launched.");
    }

    hitPaddle(ball, paddle) {
        this.playSound('hit');

        let diff = (ball.y - paddle.y) / (paddle.displayHeight / 2);
        // Clamp diff to prevent extreme angles
        diff = Phaser.Math.Clamp(diff, -1, 1);

        const currentVel = ball.body.velocity.clone();
        const speed = currentVel.length(); // Magnitude of current velocity

        // Calculate new angle based on hit position
        // Max bounce angle 60 degrees (adjust as needed)
        const maxBounceAngle = Phaser.Math.DegToRad(60);
        const bounceAngle = diff * maxBounceAngle;

        // Determine X direction based on which paddle was hit
        const directionX = (paddle === this.playerPaddle) ? 1 : -1;

        // Set new velocity based on angle and original speed
        const newVelX = speed * Math.cos(bounceAngle) * directionX;
        const newVelY = speed * Math.sin(bounceAngle);

        ball.setVelocity(newVelX, newVelY);

        // Slightly increase speed on paddle hit (optional)
        // ball.body.velocity.scale(1.05);
    }

    // --- Scoring ---
    checkGoal() {
        const gameWidth = this.scale.width;

        if (this.ball.x < 0 - this.ball.displayWidth) { // Ball passed left edge
            this.scorePoint(true); // AI scored
        } else if (this.ball.x > gameWidth + this.ball.displayWidth) { // Ball passed right edge
            this.scorePoint(false); // Player scored
        }
    }

    scorePoint(isAiScore) {
        this.playSound('score');

        if (isAiScore) {
            this.aiScore++;
            this.aiScoreText.textContent = this.aiScore;
            this.resetBall(1); // Serve to player
        } else {
            this.playerScore++;
            this.playerScoreText.textContent = this.playerScore;
            this.resetBall(-1); // Serve to AI
        }
        this.checkStageProgression();
    }

    // --- Stages ---
    checkStageProgression() {
        if (this.currentStageIndex + 1 < stages.length) {
            const nextStage = stages[this.currentStageIndex + 1];
            if (this.playerScore >= nextStage.scoreToReach || this.aiScore >= nextStage.scoreToReach) {
                this.currentStageIndex++;
                this.applyStageSettings(this.currentStageIndex);
                 this.playSound('stageUp');
            }
        }
    }

    applyStageSettings(stageIndex) {
        if (stageIndex < 0 || stageIndex >= stages.length) return;

        const stage = stages[stageIndex];
        console.log(`Applying settings for Stage ${stageIndex}`);

        // Update Background
        if (this.textures.exists(stage.bgKey)) {
             this.background.setTexture(stage.bgKey);
             // Resize tileSprite in case texture dimensions differ, or scale background
             this.background.setSize(this.scale.width, this.scale.height);
             this.background.setTilePosition(0,0); // Reset tile position
        }

        // Update Ball Texture
        if (this.textures.exists(stage.ballKey)) {
            this.ball.setTexture(stage.ballKey, 0); // Use frame 0 of spritesheet
             this.ball.setDisplaySize(BALL_SIZE, BALL_SIZE); // Ensure size is correct
        }

        // Update Speeds
        this.currentBallSpeed = BASE_BALL_SPEED * (stage.ballSpeedMultiplier || 1.0);
        this.currentAiSpeed = BASE_AI_PADDLE_SPEED * (stage.aiSpeedMultiplier || 1.0);
    }

    // --- Sound Helper ---
    playSound(key) {
        if (this.sfx[key]) {
            this.sfx[key].play();
        }
    }

    // --- Joystick Handlers ---
    handleJoystickTouchStart(event) {
        // Check if the touch is on the joystick base or knob
        if (event.target === this.joystickKnob || event.target === this.joystickContainer || event.target === this.joystickBase) {
             event.preventDefault();
             this.joystickActive = true;
             const touch = event.touches[0];
             this.joystickStartY = touch.clientY;
             this.joystickCurrentY = this.joystickStartY;
             this.joystickKnob.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Highlight knob
             // Ensure rect is calculated
             if(!this.joystickBaseRect) this.joystickBaseRect = this.joystickContainer.getBoundingClientRect();
        }
    }

    handleJoystickTouchMove(event) {
        if (!this.joystickActive || !this.joystickBaseRect) return;
        event.preventDefault();

        const touch = event.touches[0];
        this.joystickCurrentY = touch.clientY;

        // Calculate visual knob offset relative to base center
        const rect = this.joystickBaseRect; // Use stored rect
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Only care about vertical movement for knob Y position and game value
        let knobY = touch.clientY - centerY;

        // Clamp visual knob vertical position
        knobY = Phaser.Math.Clamp(knobY, -this.maxKnobOffset, this.maxKnobOffset);

        // Update visual knob position (only Y moves relevantly here)
        // We keep X centered visually for simplicity, only Y matters for Pong paddle
        this.joystickKnob.style.transform = `translate(-50%, -50%) translateY(${knobY}px)`;

        // Calculate Joystick Value (-1 to 1) - Inverted Y
        this.joystickValueY = -knobY / this.maxKnobOffset;
        this.joystickValueY = Phaser.Math.Clamp(this.joystickValueY, -1, 1);
    }

    handleJoystickTouchEnd(event) {
        if (this.joystickActive) {
            this.joystickActive = false;
            this.joystickValueY = 0; // Reset value
            this.joystickKnob.style.transform = 'translate(-50%, -50%)'; // Reset visual knob
            this.joystickKnob.style.backgroundColor = 'rgba(200, 200, 200, 0.7)'; // Reset color
        }
    }
}


// Phaser Game Configuration
const config = {
    type: Phaser.AUTO, // AUTO tries WebGL first, then Canvas
    scale: {
        mode: Phaser.Scale.FIT, // Fit game to window size
        parent: 'phaser-game-container', // ID of the div to inject the canvas into
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%', // Use full available width
        height: '100%' // Use full available height
    },
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true, // Set to true to see physics bodies/velocities
            gravity: { y: 0 } // No gravity needed for Pong
        }
    },
    render: {
      pixelArt: true // Ensures sharp pixels for pixel art assets
    },
    audio: {
        disableWebAudio: false // Use Web Audio API if available
    },
    scene: PlayScene // The scene class to start
};

// Create the Phaser Game instance
const game = new Phaser.Game(config);
