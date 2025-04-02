// Game Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const POWERUP_SPAWN_RATE = 0.01;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let health = 100;
let isRapidFire = false;
let rapidFireEndTime = 0;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let powerups = [];
let explosions = [];
let keys = {};
let lastShotTime = 0;
let gameStartTime = 0;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameUI = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score');
const healthDisplay = document.getElementById('health');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Player Object
const player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 100,
    width: 50,
    height: 50,
    speed: PLAYER_SPEED,
    isShielded: false,
    shieldEndTime: 0
};

// Initialize Game
function initGame() {
    // Set canvas size
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Event Listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Game Loop
function gameLoop(timestamp) {
    update(timestamp);
    render();
    requestAnimationFrame(gameLoop);
}

// Update Game State
function update(timestamp) {
    if (gameState === 'PLAYING') {
        // Update player position
        if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(0, player.x - player.speed);
        if (keys['ArrowRight'] || keys['d']) player.x = Math.min(GAME_WIDTH - player.width, player.x + player.speed);
        if (keys['ArrowUp'] || keys['w']) player.y = Math.max(0, player.y - player.speed);
        if (keys['ArrowDown'] || keys['s']) player.y = Math.min(GAME_HEIGHT - player.height, player.y + player.speed);
        
        // Shooting
        if ((keys[' '] || keys['Spacebar']) && timestamp - lastShotTime > (isRapidFire ? 100 : 300)) {
            shootBullet();
            lastShotTime = timestamp;
        }
        
        // Update bullets
        updateBullets();
        updateEnemyBullets();
        
        // Spawn enemies
        if (Math.random() < 0.02) {
            spawnEnemy();
        }
        
        // Spawn powerups
        if (Math.random() < POWERUP_SPAWN_RATE) {
            spawnPowerup();
        }
        
        // Update enemies
        updateEnemies(timestamp);
        
        // Update powerups
        updatePowerups();
        
        // Update explosions
        updateExplosions();
        
        // Check powerup timers
        if (isRapidFire && timestamp > rapidFireEndTime) {
            isRapidFire = false;
        }
        
        if (player.isShielded && timestamp > player.shieldEndTime) {
            player.isShielded = false;
        }
        
        // Update UI
        scoreDisplay.textContent = score;
        healthDisplay.textContent = health;
        healthDisplay.className = health > 50 ? 'text-green-500' : health > 20 ? 'text-yellow-500' : 'text-red-500';
    }
}

// Render Game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw game elements based on state
    if (gameState === 'PLAYING') {
        // Draw player
        ctx.save();
        if (player.isShielded) {
            ctx.beginPath();
            ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw bullets
        bullets.forEach(bullet => {
            ctx.fillStyle = 'cyan';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemy bullets
        enemyBullets.forEach(bullet => {
            ctx.fillStyle = 'red';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemies
        enemies.forEach(enemy => {
            ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.width, enemy.height);
        });
        
        // Draw powerups
        powerups.forEach(powerup => {
            ctx.drawImage(powerup.image, powerup.x, powerup.y, powerup.width, powerup.height);
        });
        
        // Draw explosions
        explosions.forEach(explosion => {
            ctx.fillStyle = explosion.color;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Game Control Functions
function startGame() {
    // Reset game state
    gameState = 'PLAYING';
    score = 0;
    health = 100;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    powerups = [];
    explosions = [];
    isRapidFire = false;
    player.isShielded = false;
    gameStartTime = performance.now();
    
    // Position player
    player.x = GAME_WIDTH / 2 - player.width / 2;
    player.y = GAME_HEIGHT - 100;
    
    // Update UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
}

function endGame() {
    gameState = 'GAMEOVER';
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    gameUI.classList.add('hidden');
}

// Helper Functions
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnEnemy() {
    const enemyTypes = [
        { type: 1, width: 40, height: 40, health: 1, score: 10, speed: ENEMY_SPEED * 1.2 },
        { type: 2, width: 50, height: 50, health: 2, score: 20, speed: ENEMY_SPEED * 0.8 },
        { type: 3, width: 60, height: 60, health: 3, score: 30, speed: ENEMY_SPEED * 0.5 }
    ];
    
    const type = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3;
    const enemy = enemyTypes[type - 1];
    
    const newEnemy = {
        ...enemy,
        x: getRandomInt(0, GAME_WIDTH - enemy.width),
        y: -enemy.height,
        image: new Image(),
        currentHealth: enemy.health
    };
    
    newEnemy.image.src = `https://cdn-icons-png.flaticon.com/512/3394/33940${40 + type}.png`;
    enemies.push(newEnemy);
}

function spawnPowerup() {
    const types = ['shield', 'rapidfire'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const powerup = {
        type,
        x: getRandomInt(50, GAME_WIDTH - 50),
        y: -30,
        width: 30,
        height: 30,
        speed: 2,
        image: new Image()
    };
    
    powerup.image.src = type === 'shield' 
        ? 'https://cdn-icons-png.flaticon.com/512/3394/3394044.png' 
        : 'https://cdn-icons-png.flaticon.com/512/3394/3394043.png';
    
    powerups.push(powerup);
}

function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 12,
        speed: BULLET_SPEED
    });
}

function enemyShoot(enemy) {
    enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 2,
        y: enemy.y + enemy.height,
        width: 4,
        height: 12,
        speed: BULLET_SPEED * 0.7
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        
        // Remove bullets that are off screen
        if (bullets[i].y < -bullets[i].height) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Check for enemy hits
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                enemies[j].currentHealth--;
                
                if (enemies[j].currentHealth <= 0) {
                    score += enemies[j].score;
                    createExplosion(enemies[j].x + enemies[j].width/2, enemies[j].y + enemies[j].height/2);
                    enemies.splice(j, 1);
                }
                
                bullets.splice(i, 1);
                break;
            }
        }
    }
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].y += enemyBullets[i].speed;
        
        // Remove bullets that are off screen
        if (enemyBullets[i].y > GAME_HEIGHT) {
            enemyBullets.splice(i, 1);
            continue;
        }
        
        // Check for player hit
        if (!player.isShielded && checkCollision(enemyBullets[i], player)) {
            health -= 10;
            enemyBullets.splice(i, 1);
            createExplosion(player.x + player.width/2, player.y + player.height/2, 'red');
            
            if (health <= 0) {
                endGame();
            }
        }
    }
}

function updateEnemies(timestamp) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        
        // Remove enemies that are off screen
        if (enemies[i].y > GAME_HEIGHT) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Enemy shooting logic
        if (Math.random() < 0.01 && timestamp - gameStartTime > 5000) {
            enemyShoot(enemies[i]);
        }
        
        // Check for player collision
        if (!player.isShielded && checkCollision(enemies[i], player)) {
            health -= 20;
            createExplosion(enemies[i].x + enemies[i].width/2, enemies[i].y + enemies[i].height/2);
            enemies.splice(i, 1);
            
            if (health <= 0) {
                endGame();
            }
        }
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].y += powerups[i].speed;
        
        // Remove powerups that are off screen
        if (powerups[i].y > GAME_HEIGHT) {
            powerups.splice(i, 1);
            continue;
        }
        
        // Check for player collection
        if (checkCollision(powerups[i], player)) {
            const now = performance.now();
            
            if (powerups[i].type === 'shield') {
                player.isShielded = true;
                player.shieldEndTime = now + 10000; // 10 seconds
            } else if (powerups[i].type === 'rapidfire') {
                isRapidFire = true;
                rapidFireEndTime = now + 8000; // 8 seconds
            }
            
            powerups.splice(i, 1);
        }
    }
}

function createExplosion(x, y, color = 'orange') {
    explosions.push({
        x,
        y,
        radius: 5,
        color,
        maxRadius: 30,
        growthRate: 2,
        opacity: 1,
        fadeRate: 0.05
    });
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].radius += explosions[i].growthRate;
        explosions[i].opacity -= explosions[i].fadeRate;
        
        if (explosions[i].opacity <= 0 || explosions[i].radius > explosions[i].maxRadius) {
            explosions.splice(i, 1);
        }
    }
}

function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function handleKeyDown(e) {
    keys[e.key] = true;
}

function handleKeyUp(e) {
    keys[e.key] = false;
}

// Initialize the game
initGame();
