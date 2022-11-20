const { createSocket } = require('node:dgram');

class SampClient {
    /**
     * 
     * @param {string} ip Server IP (Numeric)
     * @param {number} port Port of server
     */
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.socket = createSocket('udp4');
        this.opcode = '';
        this.password = '';
    }
    /**
     * Send query to samp server
     * @param {string} command Command to send
     * @return {string} Response of query 
     */
    send(command) {
        if (!this.opcode) {
            throw new Error('opcode is not defined');
        }

        const address = String.fromCharCode.apply(null, this.ip.split('.'))
        const port = String.fromCharCode(this.port & 0xFF, this.port >>> 8);
        const password = String.fromCharCode(this.password.length & 0xFF, this.password.length >>> 8);
        const cmdlen = String.fromCharCode(command.length & 0xFF, command.length >>> 8);

        this.responsePrefix = 'SAMP' + address + port + this.opcode;
        this.packet = Buffer.from(this.responsePrefix + password + this.password + cmdlen + command, 'binary');


        try {
            this.socket.send(this.packet, 0, this.packet.length, this.port, this.ip);
        } catch (e) {
            console.warn(e);
        }

        const controller = setTimeout(() => {
            this.socket.close();
            console.warn(`[Error] no se pudo conectar.`);
        }, 2000);

        this.socket.on('message', (message) => {
            if (controller) clearTimeout(controller);

            if (message.toString('binary', 0, 11) === this.responsePrefix) {
                let msg = message.toString('binary', 13);
                // console.log(msg);
                this.socket.close();
                console.log("a")
                return msg;
            }

        });
    }
}

const client = new SampClient('127.0.0.1', 7777);
client.opcode = 'x';
client.password = 'change';
const response = client.send('hello');
console.log(response);