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
        this.socket = createSocket('udp4');
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

        try {
            this.socket.send(this.packet, 0, this.packet.length, this.port, this.ip);
        } catch (e) {
            console.warn(e);
        }

        const controller = setTimeout(() => {
            this.socket.close();
            console.warn(`[Error] no se pudo conectar.`);
        }, 2000);

        return new Promise((resolve, reject) => {
            this.socket.on('message', (message) => {
                if (controller) clearTimeout(controller);
                this.socket.close();
                resolve(message);
            });
        })
    }

    async executeCommand(command) {
        this.#opcode = 'x';
        this.#command = command;
        const response = await this.send();
        if (response.toString('binary', 0, 11) === this.#responsePrefix) {
            return response.toString('binary', 13);
        }
    }
    async getInfo() {
        this.#opcode = 'i';
        const response = (await this.send()).subarray(11);

        let offset = 0;
        let info = {};

        info.passworded = response.readUInt8(offset);
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

        console.log(info)
        return info;
    }

    getUsers() {
        this.#opcode = ''
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