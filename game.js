const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');

// タッチ状態
const touch = {
    isActive: false,
    targetX: 0,
    targetY: 0
};

// ゲーム状態
let score = 0;
let gameOver = false;
let explosionParticles = [];
let explosionTime = 0;
const EXPLOSION_DURATION = 60;
let bossDefeatedCount = 0; // ボス撃破カウント

// 基準速度（1フレームあたりの移動量）
const BASE_PLAYER_SPEED = 3;
const BASE_BULLET_SPEED = 5;
const BASE_ENEMY_BULLET_SPEED = 3;
const BASE_POWERUP_SPEED = 2;

// プレイヤー
const player = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    width: 30,
    height: 30,
    speed: BASE_PLAYER_SPEED,
    color: '#0000ff',
    powerLevel: 1,
    shootCooldown: 0
};

// 弾
const bullets = [];
const bulletSpeed = BASE_BULLET_SPEED;
const shootCooldownTime = 10;

// 敵の弾
const enemyBullets = [];
const enemyBulletSpeed = BASE_ENEMY_BULLET_SPEED;

// 敵の種類の定義
const EnemyTypes = {
    NORMAL: {
        hp: 1,
        speed: 2,
        color: '#ff0000',
        points: 100,
        size: 30
    },
    SHOOTER: {
        hp: 2,
        speed: 1.5,
        color: '#ff6600',
        points: 200,
        size: 35,
        shootRate: 0.02
    },
    TANK: {
        hp: 4,
        speed: 1,
        color: '#cc0000',
        points: 300,
        size: 40
    },
    BOSS: {
        hp: 20,
        speed: 1,
        color: '#990000',
        points: 1000,
        size: 80,
        shootRate: 0.1
    }
};

// 敵
const enemies = [];
const enemySpawnRate = 0.02;
let bossSpawned = false;
let waveCount = 0;
const wavesUntilBoss = 10;

// パワーアップアイテム
const powerUps = [];
const powerUpSpeed = BASE_POWERUP_SPEED;

// キー入力状態
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// キー入力イベントリスナー
document.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
    }
});

// タッチイベント
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    touch.isActive = true;
    touch.targetX = (touchX / rect.width) * canvas.width;
    touch.targetY = (touchY / rect.height) * canvas.height;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    touch.targetX = (touchX / rect.width) * canvas.width;
    touch.targetY = (touchY / rect.height) * canvas.height;
}, { passive: false });

canvas.addEventListener('touchend', () => {
    touch.isActive = false;
});

// 弾の発射
function shoot() {
    if (player.shootCooldown > 0) return;
    
    player.shootCooldown = shootCooldownTime;
    
    switch(player.powerLevel) {
        case 1: // 通常射撃
            createBullet(0);
            break;
        case 2: // 高速射撃
            createBullet(0);
            player.shootCooldown = shootCooldownTime * 0.8;
            break;
        case 3: // 2方向射撃
            createBullet(-0.2);
            createBullet(0.2);
            break;
        case 4: // 3方向高速射撃
            createBullet(-0.2);
            createBullet(0);
            createBullet(0.2);
            player.shootCooldown = shootCooldownTime * 0.8;
            break;
        case 5: // 5方向射撃
            createBullet(-0.3);
            createBullet(-0.15);
            createBullet(0);
            createBullet(0.15);
            createBullet(0.3);
            break;
    }
}

// 弾の生成
function createBullet(angle) {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        color: '#fff',
        angle: angle
    });
}

// 敵の生成
function createEnemy() {
    if (bossSpawned) return;

    if (Math.random() < enemySpawnRate) {
        waveCount++;
        
        if (waveCount >= wavesUntilBoss) {
            createBoss();
            return;
        }

        let type;
        const rand = Math.random();
        if (rand < 0.5) {
            type = EnemyTypes.NORMAL;
        } else if (rand < 0.8) {
            type = EnemyTypes.SHOOTER;
        } else {
            type = EnemyTypes.TANK;
        }

        const enemy = {
            x: Math.random() * (canvas.width - type.size),
            y: 0,
            width: type.size,
            height: type.size,
            color: type.color,
            hp: type.hp,
            maxHp: type.hp,
            speed: type.speed * (0.8 + Math.random() * 0.4),
            points: type.points,
            type: type,
            movePattern: Math.floor(Math.random() * 3),
            moveTime: 0,
            shootRate: type.shootRate || 0
        };

        enemies.push(enemy);
    }
}

// ボスの生成
function createBoss() {
    const type = EnemyTypes.BOSS;
    const powerMultiplier = 1 + (bossDefeatedCount * 0.5); // ボスの強さ倍率
    enemies.push({
        x: canvas.width / 2 - type.size / 2,
        y: -type.size,
        width: type.size,
        height: type.size,
        color: type.color,
        hp: Math.floor(type.hp * powerMultiplier),
        maxHp: Math.floor(type.hp * powerMultiplier),
        speed: type.speed * (1 + bossDefeatedCount * 0.2),
        points: type.points * powerMultiplier,
        type: type,
        movePattern: 3,
        moveTime: 0,
        shootRate: type.shootRate * (1 + bossDefeatedCount * 0.3)
    });
    bossSpawned = true;
}

// 敵の弾の生成
function createEnemyBullet(enemy) {
    const angle = Math.atan2(
        player.y + player.height/2 - (enemy.y + enemy.height/2),
        player.x + player.width/2 - (enemy.x + enemy.width/2)
    );
    
    enemyBullets.push({
        x: enemy.x + enemy.width/2,
        y: enemy.y + enemy.height/2,
        width: 4,
        height: 4,
        color: '#ff9900',
        speedX: Math.cos(angle) * enemyBulletSpeed,
        speedY: Math.sin(angle) * enemyBulletSpeed
    });
}

// パワーアップアイテムの生成
function createPowerUp(x, y) {
    if (Math.random() < 0.1) {
        powerUps.push({
            x: x,
            y: y,
            width: 15,
            height: 15,
            color: '#ffff00'
        });
    }
}

// 衝突判定
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 爆発パーティクルの生成
function createExplosion(x, y) {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + Math.random() * 3;
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3,
            color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
            alpha: 1
        });
    }
}

// ゲームオーバー処理
function handleGameOver() {
    if (explosionTime === 0) {
        createExplosion(player.x + player.width/2, player.y + player.height/2);
    }
    
    explosionParticles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha = Math.max(0, 1 - explosionTime / EXPLOSION_DURATION);
        particle.size *= 0.95;
    });

    explosionParticles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    explosionTime++;

    if (explosionTime > EXPLOSION_DURATION) {
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Touch or Press Space to Restart', canvas.width / 2, canvas.height / 2 + 80);

        if (touch.isActive || keys.Space) {
            resetGame();
        }
    }
}

// ゲームリセット
function resetGame() {
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    player.x = canvas.width / 2;
    player.y = canvas.height - 30;
    player.powerLevel = 1;
    bullets.length = 0;
    enemies.length = 0;
    powerUps.length = 0;
    enemyBullets.length = 0;
    explosionParticles = [];
    explosionTime = 0;
    bossSpawned = false;
    waveCount = 0;
    bossDefeatedCount = 0;
}

// 更新処理
function update() {
    if (gameOver) {
        handleGameOver();
        return;
    }

    // プレイヤーの移動
    if (touch.isActive) {
        // タッチ位置に向かって移動
        const dx = touch.targetX - (player.x + player.width/2);
        const dy = touch.targetY - (player.y + player.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            const moveX = (dx / distance) * BASE_PLAYER_SPEED;
            const moveY = (dy / distance) * BASE_PLAYER_SPEED;
            
            const newX = player.x + moveX;
            const newY = player.y + moveY;
            
            // 画面外に出ないように制限
            player.x = Math.max(0, Math.min(canvas.width - player.width, newX));
            player.y = Math.max(0, Math.min(canvas.height - player.height, newY));
        }
    } else {
        // キーボード操作
        if (keys.ArrowLeft && player.x > 0) {
            player.x -= BASE_PLAYER_SPEED;
        }
        if (keys.ArrowRight && player.x < canvas.width - player.width) {
            player.x += BASE_PLAYER_SPEED;
        }
        if (keys.ArrowUp && player.y > 0) {
            player.y -= BASE_PLAYER_SPEED;
        }
        if (keys.ArrowDown && player.y < canvas.height - player.height) {
            player.y += BASE_PLAYER_SPEED;
        }
    }

    // プレイヤーのクールダウン更新
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }

    // 自動射撃
    shoot();

    // 弾の移動
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += BASE_BULLET_SPEED * Math.sin(bullets[i].angle);
        bullets[i].y -= BASE_BULLET_SPEED * Math.cos(bullets[i].angle);
        if (bullets[i].y < 0 || bullets[i].x < 0 || bullets[i].x > canvas.width) {
            bullets.splice(i, 1);
        }
    }

    // パワーアップアイテムの移動と取得判定
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].y += BASE_POWERUP_SPEED;
        
        if (powerUps[i].y > canvas.height) {
            powerUps.splice(i, 1);
            continue;
        }

        if (checkCollision(player, powerUps[i])) {
            if (player.powerLevel < 5) {
                player.powerLevel++;
            }
            powerUps.splice(i, 1);
            continue;
        }
    }

    // 敵の生成と移動
    createEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        enemy.moveTime++;
        
        switch(enemy.movePattern) {
            case 1:
                enemy.x += Math.sin(enemy.moveTime * 0.05) * 2;
                enemy.y += enemy.speed;
                break;
            case 2:
                enemy.x += Math.cos(enemy.moveTime * 0.05) * 1.5;
                enemy.y += enemy.speed * 0.7;
                break;
            case 3:
                if (enemy.y < 50) {
                    enemy.y += enemy.speed;
                } else {
                    enemy.x += Math.cos(enemy.moveTime * 0.02) * 2;
                }
                break;
            default:
                enemy.y += enemy.speed;
        }

        if (enemy.x < 0 || enemy.x > canvas.width - enemy.width) {
            enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
        }
        
        if (enemy.shootRate && Math.random() < enemy.shootRate) {
            createEnemyBullet(enemy);
        }

        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            continue;
        }

        if (checkCollision(player, enemy)) {
            gameOver = true;
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[j], enemy)) {
                enemy.hp--;
                bullets.splice(j, 1);
                
                if (enemy.hp <= 0) {
                    createPowerUp(enemy.x, enemy.y);
                    score += enemy.points;
                    scoreElement.textContent = score;
                    if (enemy.type === EnemyTypes.BOSS) {
                        bossSpawned = false;
                        waveCount = 0;
                        bossDefeatedCount++;
                    }
                    enemies.splice(i, 1);
                }
                break;
            }
        }
    }

    // 敵の弾の移動と当たり判定
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;

        if (bullet.y > canvas.height || bullet.y < 0 || 
            bullet.x > canvas.width || bullet.x < 0) {
            enemyBullets.splice(i, 1);
            continue;
        }

        if (checkCollision(player, bullet)) {
            gameOver = true;
            break;
        }
    }

    // 描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // パワーアップアイテムの描画
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.color;
        ctx.beginPath();
        const starPoints = 5;
        const outerRadius = powerUp.width / 2;
        const innerRadius = powerUp.width / 4;
        const centerX = powerUp.x + powerUp.width / 2;
        const centerY = powerUp.y + powerUp.height / 2;

        for (let i = 0; i < starPoints * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / starPoints;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    });

    // プレイヤーの描画
    if (!gameOver || explosionTime === 0) {
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.ellipse(player.x + player.width/2, player.y + player.height/2, player.width/2, player.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y + player.height/2);
        ctx.lineTo(player.x + player.width/4, player.y + player.height/4);
        ctx.lineTo(player.x + player.width*3/4, player.y + player.height/4);
        ctx.lineTo(player.x + player.width, player.y + player.height/2);
        ctx.fillStyle = '#0099ff';
        ctx.fill();
    }

    // 弾の描画
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width, 0, Math.PI * 2);
        ctx.fill();
    });
