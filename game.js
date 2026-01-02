const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Input State
const inputs = {
    up: false,
    down: false,
    left: false,
    right: false
};

// 1. Input Handling (WASD / Arrows)
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': inputs.up = true; break;
        case 'KeyS': inputs.down = true; break;
        case 'KeyA': inputs.left = true; break;
        case 'KeyD': inputs.right = true; break;
        case 'ArrowUp': inputs.up = true; break;
        case 'ArrowDown': inputs.down = true; break;
        case 'ArrowLeft': inputs.left = true; break;
        case 'ArrowRight': inputs.right = true; break;
    }
    socket.emit('movement', inputs);
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': inputs.up = false; break;
        case 'KeyS': inputs.down = false; break;
        case 'KeyA': inputs.left = false; break;
        case 'KeyD': inputs.right = false; break;
        case 'ArrowUp': inputs.up = false; break;
        case 'ArrowDown': inputs.down = false; break;
        case 'ArrowLeft': inputs.left = false; break;
        case 'ArrowRight': inputs.right = false; break;
    }
    socket.emit('movement', inputs);
});

// 2. Mouse Handling (Shooting)
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // We don't have our own coordinates here easily (they are on the server),
    // but we can find "our" player from the last state update.
    if (myPlayer) {
        const angle = Math.atan2(mouseY - myPlayer.y, mouseX - myPlayer.x);
        socket.emit('shoot', angle);
    }
});

let myPlayer = null;

// 3. Rendering (Listen for State Updates)
socket.on('stateUpdate', (state) => {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const players = state.players;
    const projectiles = state.projectiles;

    // Draw Players
    for (const id in players) {
        const p = players[id];
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        
        if (id === socket.id) {
            myPlayer = p; // Update local reference
            ctx.fillStyle = '#3498db'; // Blue (Self)
        } else {
            ctx.fillStyle = '#e74c3c'; // Red (Enemy)
        }
        
        ctx.fill();
        ctx.closePath();

        // Draw HUD (HP & Score)
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`HP: ${p.hp}`, p.x, p.y - 30);
        ctx.fillText(`Score: ${p.score}`, p.x, p.y - 42);
    }

    // Draw Projectiles
    ctx.fillStyle = 'black';
    projectiles.forEach((proj) => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
});