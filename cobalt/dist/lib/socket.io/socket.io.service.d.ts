import { Types } from "mongoose";
import { Server, Socket } from "socket.io";
export declare class SocketIoService {
    server: Server;
    getSocketsByUserId(id: Types.ObjectId): Socket[];
    useAuthMiddleware(): void;
}
