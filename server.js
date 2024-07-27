const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

const channels = {}; // Objeto para almacenar canales y sus conexiones

// Función para suscribirse a un canal específico
function subscribe(ws, channel) {
    if (!channels[channel]) {
        channels[channel] = new Set();
    }
    channels[channel].add(ws);
}

// Función para desuscribirse de un canal específico
function unsubscribe(ws, channel) {
    if (channels[channel]) {
        channels[channel].delete(ws);
        if (channels[channel].size === 0) {
            delete channels[channel];
        }
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Manejar la suscripción a un canal
        if (data.action === 'subscribe') {
            const { project, role, user } = data;
            const projectChannel = `project-${project}`;
            const roleChannel = `role-${role}`;
            const userChannel = `user-${user}`;
            
            subscribe(ws, projectChannel);
            subscribe(ws, roleChannel);
            subscribe(ws, userChannel);
            
            console.log(`Client subscribed to channels: ${projectChannel}, ${roleChannel}, ${userChannel}`);
        }

        // Manejar el envío de mensajes a un canal
        if (data.action === 'publish') {
            const { project, role, user, message } = data;
            const projectChannel = `project-${project}`;
            const roleChannel = `role-${role}`;
            const userChannel = `user-${user}`;

            [projectChannel, roleChannel, userChannel].forEach(channel => {
                if (channels[channel]) {
                    channels[channel].forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });
                    console.log(`Message sent to channel: ${channel}`);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Eliminar el cliente de todos los canales a los que estaba suscrito
        Object.keys(channels).forEach(channel => {
            unsubscribe(ws, channel);
        });
    });
});

console.log('WebSocket server started on ws://localhost:8080');
