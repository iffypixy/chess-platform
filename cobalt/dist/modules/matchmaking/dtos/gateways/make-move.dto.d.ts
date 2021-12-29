import { Square } from "chess.js";
import { PromotionPiece } from "@modules/matchmaking";
export declare class MakeMoveDto {
    matchId: string;
    from: Square;
    to: Square;
    promotion: PromotionPiece;
}
