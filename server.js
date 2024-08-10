const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

const channels = {}; // Objeto para almacenar canales y sus conexiones
const writeInLogFile=(message)=>{
    const fs = require('fs');
    const date = new Date();
    const logMessage = `${date.toISOString()} - ${message}\n`;
    fs.appendFile('log.txt', logMessage, function (err) {
        if (err) throw err;
        });
}
// Función para suscribirse a un canal específico
function subscribe(ws, channel) {
    try {
        if (!channels[channel]) {
            channels[channel] = new Set();
        }
        channels[channel].add(ws);
    } catch (error) {
        writeInLogFile(`Error subscribing to channel ${channel}: ${error}`);
    }
}

// Función para desuscribirse de un canal específico
function unsubscribe(ws, channel) {
    try {
        if (channels[channel]) {
            channels[channel].delete(ws);
            if (channels[channel].size === 0) {
                delete channels[channel];
            }
        }
    } catch (error) {
        writeInLogFile(`Error unsubscribing from channel ${channel}: ${error}`);
    }
}

wss.on('connection', (ws) => {
    writeInLogFile('Client connected');

    ws.on('message', (message) => {
        try {
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
                writeInLogFile(`Client subscribed to channels: ${projectChannel}, ${roleChannel}, ${userChannel}`);
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
                                try {
                                    client.send(message);
                                } catch (sendError) {
                                    writeInLogFile(`Error sending message to channel ${channel}: ${sendError}`);
                                }
                            }
                        });
                        writeInLogFile(`Message sent to channel ${channel}: ${message}`);
                    }
                });
            }
        } catch (error) {
            writeInLogFile(`Error parsing message: ${error}`);
        }
    });

    ws.on('close', () => {
        writeInLogFile('Client disconnected');
        Object.keys(channels).forEach(channel => {
            unsubscribe(ws, channel);
        });
    });
});

writeInLogFile('Server started');