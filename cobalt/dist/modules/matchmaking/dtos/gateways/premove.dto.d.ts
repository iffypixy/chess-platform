import { Square } from "chess.js";
import { PromotionPiece } from "@modules/matchmaking";
export declare class PremoveDto {
    matchId: string;
    from: Square;
    to: Square;
    promotion: PromotionPiece;
}
