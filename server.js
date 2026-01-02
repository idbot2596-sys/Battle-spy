const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Game Constants
const FPS = 60;
const PLAYER_SPEED = 5;
const PROJECTILE_SPEED = 10;
const PLAYER_RADIUS = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Game State
let players = {};
let projectiles = [];
let projectileIdCounter = 0;

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    // Initialize new player
    players[socket.id] = {
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color fallback
        hp: 100,
        score: 0,
        inputs: { up: false, down: false, left: false, right: false } // Track keys
    };

    // Handle Input
    socket.on('movement', (inputs) => {
        if (players[socket.id]) {
            players[socket.id].inputs = inputs;
        }
    });

    // Handle Shooting
    socket.on('shoot', (angle) => {
        if (!players[socket.id]) return;
        
        projectiles.push({
            id: projectileIdCounter++,
            x: players[socket.id].x,
            y: players[socket.id].y,
            angle: angle,
            ownerId: socket.id
        });
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
    });
});

// Server Game Loop (60 FPS)
setInterval(() => {
    // 1. Update Player Positions based on inputs
    for (const id in players) {
        const p = players[id];
        if (p.inputs.up && p.y > 0) p.y -= PLAYER_SPEED;
        if (p.inputs.down && p.y < CANVAS_HEIGHT) p.y += PLAYER_SPEED;
        if (p.inputs.left && p.x > 0) p.x -= PLAYER_SPEED;
        if (p.inputs.right && p.x < CANVAS_WIDTH) p.x += PLAYER_SPEED;
    }

    // 2. Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += Math.cos(proj.angle) * PROJECTILE_SPEED;
        proj.y += Math.sin(proj.angle) * PROJECTILE_SPEED;

        // Remove if off-screen
        if (proj.x < 0 || proj.x > CANVAS_WIDTH || proj.y < 0 || proj.y > CANVAS_HEIGHT) {
            projectiles.splice(i, 1);
            continue;
        }

        // 3. Collision Detection (Projectile vs Player)
        for (const id in players) {
            // Don't hit yourself
            if (proj.ownerId === id) continue;

            const p = players[id];
            const dx = p.x - proj.x;
            const dy = p.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < PLAYER_RADIUS) {
                // HIT!
                p.hp -= 10;
                projectiles.splice(i, 1); // Remove bullet

                // Check Death
                if (p.hp <= 0) {
                    // Respawn victim
                    p.hp = 100;
                    p.x = Math.random() * CANVAS_WIDTH;
                    p.y = Math.random() * CANVAS_HEIGHT;
                    
                    // Give point to shooter
                    if (players[proj.ownerId]) {
                        players[proj.ownerId].score += 1;
                    }
                }
                break; // Bullet hit something, stop checking other players
            }
        }
    }

    // 4. Send State to all clients
    io.emit('stateUpdate', { players, projectiles });

}, 1000 / FPS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});