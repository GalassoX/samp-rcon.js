const { createSocket } = require('node:dgram');

class SampClient {
    #opcode = '';
    #command = '';
    #responsePrefix = '';
    /**
     * 
     * @param {string} ip Server IP (Numeric)
     * @param {number} port Port of server
     */
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.#opcode = '';
        this.password = '';
        this.#command = '';
    }
    /**
     * Send query to samp server
     * @param {string} command Command to send
     * @return {Promise<Buffer>} Response of query 
     */
    async send() {
        if (!this.#opcode) {
            throw new Error('opcode is not defined');
        }

        const address = String.fromCharCode.apply(null, this.ip.split('.'))
        const port = String.fromCharCode(this.port & 0xFF, this.port >>> 8);

        this.#responsePrefix = 'SAMP' + address + port + this.#opcode;

        if (this.#opcode === 'x') {
            const password = String.fromCharCode(this.password.length & 0xFF, this.password.length >>> 8);
            const cmdlen = String.fromCharCode(this.#command.length & 0xFF, this.#command.length >>> 8);
            this.packet = Buffer.from(this.#responsePrefix + password + this.password + cmdlen + this.#command, 'binary');
        } else {
            this.packet = Buffer.from(this.#responsePrefix, 'binary');
        }

        const socket = createSocket('udp4');

        return new Promise((resolve, reject) => {
            const controller = setTimeout(() => {
                socket.close();
                console.warn(`[Error] no se pudo conectar.`);
            }, 2000);

            try {
                socket.send(this.packet, 0, this.packet.length, this.port, this.ip);
            } catch (e) {
                console.warn(e);
            }

            socket.on('message', (message) => {
                if (controller) clearTimeout(controller);
                socket.close();
                resolve(message);
            });
        })
    }

    async executeCommand(command) {
        this.#opcode = 'x';
        this.#command = command;
        const response = await this.send();
        return response.toString('binary', 13);
    }
    async getInfo() {
        this.#opcode = 'i';
        const response = (await this.send()).subarray(11);

        let offset = 0;
        let info = {};

        info.passworded = Boolean(response.readUInt8(offset));
        offset += 1;

        info.players = response.readUInt16LE(offset);
        offset += 2;

        info.maxplayers = response.readUInt16LE(offset);
        offset += 2;

        let strlen = response.readUInt16LE(offset);
        offset += 4;

        info.hostname = decode(response.subarray(offset, offset += strlen));

        strlen = response.readUInt16LE(offset);
        offset += 4;

        info.gamemode = decode(response.subarray(offset, offset += strlen));

        strlen = response.readUInt16LE(offset);
        offset += 4;

        info.mapname = decode(response.subarray(offset, offset += strlen));

        return info;
    }

    async getUsers() {
        this.#opcode = 'd';
        const response = (await this.send()).subarray(11);

        let offset = 0;
        let players = [];

        let numPlayers = response.readUInt16LE(offset);
        offset += 2;

        while (numPlayers > 0) {
            let player = {};

            player.id = response.readUInt8(offset);
            ++offset;

            let strlen = response.readUInt8(offset);
            ++offset;

            player.name = decode(response.subarray(offset, offset += strlen));

            player.score = response.readUInt16LE(offset);
            offset += 4;

            player.ping = response.readUInt16LE(offset);
            offset += 4;

            players.push(player);
            numPlayers--;
        }

        return players;
    }

    async getServerRules() {
        this.#opcode = 'r';
        const response = (await this.send()).subarray(11);

        let offset = 0;
        let object = {};
        let prop, value;

        let rulecount = response.readUInt16LE(offset);
        offset += 2;

        while (rulecount > 0) {
            let strlen = response.readUInt8(offset);
            ++offset;

            prop = decode(response.subarray(offset, offset += strlen));

            strlen = response.readUInt8(offset);
            ++offset;

            value = decode(response.subarray(offset, offset += strlen));

            object[prop] = value;

            rulecount--;
        }
        return object;
    }
}

const decode = (buffer) => {
    let charset = ''
    for (let i = 0; i < 128; i++) { charset += String.fromCharCode(i) }
    charset += '€�‚ƒ„…†‡�‰�‹�����‘’“”•–—�™�›���� ΅Ά£¤¥¦§¨©�«¬­®―°±²³΄µ¶·ΈΉΊ»Ό½ΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡ�ΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώ�'
    let charsetBuffer = Buffer.from(charset, 'ucs2')
    let decodeBuffer = Buffer.alloc(buffer.length * 2)
    for (let i = 0; i < buffer.length; i++) {
        decodeBuffer[i * 2] = charsetBuffer[buffer[i] * 2]
        decodeBuffer[i * 2 + 1] = charsetBuffer[buffer[i] * 2 + 1]
    }
    return decodeBuffer.toString('ucs2')
}

module.exports = SampClient;