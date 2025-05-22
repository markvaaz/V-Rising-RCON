import net from 'net';

export class RconClient {
  private socket: net.Socket;
  private host: string;
  private port: number;
  private password: string;
  private requestId: number = 0;
  public ondisconnect: () => void = () => { };

  constructor(host: string, port: number, password: string) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.socket = new net.Socket();
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(this.port, this.host, () => {
        this.authenticate().then(resolve).catch(reject);
      });

      this.socket.on('error', reject);
    });
  }

  private sendPacket(id: number, type: number, body: string): void {
    const bodyBuf = Buffer.from(body + '\x00', 'utf8');
    const packetSize = 4 + 4 + bodyBuf.length + 1;
    const buffer = Buffer.alloc(4 + packetSize);

    buffer.writeInt32LE(packetSize, 0);         // Length
    buffer.writeInt32LE(id, 4);                 // Request ID
    buffer.writeInt32LE(type, 8);               // Type
    bodyBuf.copy(buffer, 12);                   // Body
    buffer.writeInt8(0, 12 + bodyBuf.length);   // Null byte

    this.socket.write(buffer);
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.sendPacket(id, 3, this.password);

      this.socket.once('data', (data) => {
        const responseId = data.readInt32LE(4);
        const type = data.readInt32LE(8);

        if (responseId === -1 || type !== 2) {
          reject(new Error('RCON authentication failed.'));
        } else {
          this.socket.on('close', this.ondisconnect);
          resolve();
        }
      });
    });
  }

  sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.sendPacket(id, 2, command);

      this.socket.once('data', (data) => {
        const length = data.readInt32LE(0);

        const response = data.toString('utf8', 12, length + 4 - 2);
        resolve(response.trim());
      });
    });
  }

  disconnect(): void {
    if (!this.socket.destroyed) {
      this.ondisconnect();
      this.socket.removeAllListeners();
      this.socket.destroy();
    }
  }
}