const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve files from the root directory (for your setup)
app.use(express.static(__dirname));

// --- GAME SETTINGS ---
const FPS = 60;
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;
const PLAYER_SPEED = 5;
const PROJECTILE_SPEED = 12;
const PLAYER_RADIUS = 20;

// Generate Random Obstacles (Trees/Rocks)
const OBSTACLES = [];
for (let i = 0; i < 50; i++) {
    OBSTACLES.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        r: 30 + Math.random() * 50 // Random size
    });
}

let players = {};
let projectiles = [];
let projectileIdCounter = 0;

io.on('connection', (socket) => {
    console.log('New player:', socket.id);

    // Send Map Info to the new player immediately
    socket.emit('mapData', { 
        width: MAP_WIDTH, 
        height: MAP_HEIGHT, 
        obstacles: OBSTACLES 
    });

    players[socket.id] = {
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        hp: 100,
        score: 0,
        inputs: { up: false, down: false, left: false, right: false }
    };

    socket.on('movement', (inputs) => {
        if (players[socket.id]) players[socket.id].inputs = inputs;
    });

    socket.on('shoot', (angle) => {
        if (!players[socket.id]) return;
        projectiles.push({
            id: projectileIdCounter++,
            x: players[socket.id].x,
            y: players[socket.id].y,
            angle: angle,
            ownerId: socket.id,
            timeLeft: 100 // Bullet lives for ~1.5 seconds
        });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
});

// Game Loop
setInterval(() => {
    // 1. Move Players
    for (const id in players) {
        const p = players[id];
        // Calculate potential new position
        let newX = p.x;
        let newY = p.y;

        if (p.inputs.up) newY -= PLAYER_SPEED;
        if (p.inputs.down) newY += PLAYER_SPEED;
        if (p.inputs.left) newX -= PLAYER_SPEED;
        if (p.inputs.right) newX += PLAYER_SPEED;

        // Keep inside Map Boundaries
        p.x = Math.max(0, Math.min(MAP_WIDTH, newX));
        p.y = Math.max(0, Math.min(MAP_HEIGHT, newY));
    }

    // 2. Move Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += Math.cos(proj.angle) * PROJECTILE_SPEED;
        proj.y += Math.sin(proj.angle) * PROJECTILE_SPEED;
        proj.timeLeft--;

        // Remove if time up or out of bounds
        if (proj.timeLeft <= 0 || proj.x < 0 || proj.x > MAP_WIDTH || proj.y < 0 || proj.y > MAP_HEIGHT) {
            projectiles.splice(i, 1);
            continue;
        }

        // Collision Check
        for (const id in players) {
            if (proj.ownerId === id) continue;
            const p = players[id];
            const dist = Math.hypot(p.x - proj.x, p.y - proj.y);

            if (dist < PLAYER_RADIUS + 5) {
                p.hp -= 10;
                projectiles.splice(i, 1);
                
                if (p.hp <= 0) {
                    p.hp = 100;
                    p.x = Math.random() * MAP_WIDTH;
                    p.y = Math.random() * MAP_HEIGHT;
                    if (players[proj.ownerId]) players[proj.ownerId].score++;
                }
                break;
            }
        }
    }

    io.emit('stateUpdate', { players, projectiles });
}, 1000 / FPS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
