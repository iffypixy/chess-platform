import { ChessService } from "./chess.service";
import { ChessGamePublicData } from "./schemas";
export declare class ChessController {
    private readonly chessService;
    constructor(chessService: ChessService);
    getRandom(): Promise<{
        game: ChessGamePublicData;
    }>;
}
