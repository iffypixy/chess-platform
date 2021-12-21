import * as React from "react";
import * as ChessJS from "chess.js";
import {Square} from "chess.js";
import {Chessground} from "chessground";
import {
  Dests,
  Key,
  MoveMetadata,
  Piece,
  PiecesDiff,
  Role,
  SetPremoveMetadata,
} from "chessground/types";
import {Api} from "chessground/api";
import {Box} from "@chakra-ui/react";
import "chessground/assets/chessground.base.css";

import {MatchSide} from "@shared/api/matches";
import "./theme.css";

const Chess = typeof ChessJS === "function" ? ChessJS : ChessJS.Chess;

type PromotionPiece = Exclude<ChessJS.PieceType, "p" | "k">;

interface ChessboardHandlerParams {
  engine: ChessJS.ChessInstance;
  api: Api;
}

export interface HandleMoveMakingParams extends ChessboardHandlerParams {
  orig: Key;
  dest: Key;
  capturedPiece: Piece | undefined;
}

export interface HandleOwnMoveMakingParams extends ChessboardHandlerParams {
  orig: Key;
  dest: Key;
  metadata: MoveMetadata;
}

export interface HandlePremoveSetParams extends ChessboardHandlerParams {
  orig: Key;
  dest: Key;
  metadata: SetPremoveMetadata | undefined;
}

export interface HandlePremoveUnsetParams extends ChessboardHandlerParams {}
export interface HandleBoardLoadParams extends ChessboardHandlerParams {}

interface ChessboardProps {
  fen: string;
  side: MatchSide;
  isViewOnly: boolean;
  isReversed: boolean;
  handleMoveMaking: (opts: HandleMoveMakingParams) => void;
  handleOwnMoveMaking: (opts: HandleOwnMoveMakingParams) => void;
  handlePremoveSet: (opts: HandlePremoveSetParams) => void;
  handlePremoveUnset: (opts: HandlePremoveUnsetParams) => void;
  handleBoardLoad: (opts: HandleBoardLoadParams) => void;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  side,
  isViewOnly,
  isReversed,
  handleMoveMaking,
  handleOwnMoveMaking,
  handlePremoveSet,
  handlePremoveUnset,
  handleBoardLoad,
}) => {
  const groundRef = React.useCallback((node) => {
    if (!node) return;

    const engine = new Chess(fen);

    const promptPromotionPiece = () => "q";

    const dests = () => {
      const dests: Dests = new Map();

      engine.SQUARES.forEach((square) => {
        const moves = engine.moves({square, verbose: true});

        dests.set(
          square,
          moves.map((move) => move.to)
        );
      });

      return dests;
    };

    const role = (promotion: PromotionPiece): Role => {
      if (promotion === "q") return "queen";
      else if (promotion === "n") return "knight";
      else if (promotion === "b") return "bishop";
      else if (promotion === "r") return "rook";

      return "queen";
    };

    const turn = (): MatchSide => (engine.turn() === "w" ? "white" : "black");

    const isCheckmate = () => engine.in_checkmate();
    const isCheck = () => engine.in_check();

    const api = Chessground(node, {
      fen,
      turnColor: turn(),
      viewOnly: isViewOnly || isCheckmate(),
      orientation: isReversed ? "black" : "white",
      check: isCheck(),
      movable: {
        free: false,
        color: side || undefined,
        dests: dests(),
        events: {
          after: (orig, dest, metadata) => {
            handleOwnMoveMaking({engine, api, orig, dest, metadata});
          },
        },
      },
      premovable: {
        events: {
          set: (orig, dest, metadata) => {
            handlePremoveSet({engine, api, orig, dest, metadata});
          },
          unset: () => {
            handlePremoveUnset({engine, api});
          },
        },
      },
      events: {
        move: async (orig, dest, capturedPiece) => {
          const current = turn();

          const possible = engine.moves({square: orig, verbose: true});

          const isPromotion = possible
            .filter((move) => move.flags.includes("p"))
            .some((move) => move.to === dest);

          const promotion = (isPromotion &&
            (await promptPromotionPiece())) as PromotionPiece;

          const move = engine.move({
            from: orig as Square,
            to: dest as Square,
            promotion,
          });

          if (!move) return;

          if (isPromotion) {
            const map: PiecesDiff = new Map();

            map.set(dest, {
              role: role(promotion),
              promoted: true,
              color: current,
            });

            api.setPieces(map);
          }

          const isEnPassant = move.flags.includes("e");

          if (isEnPassant) {
            const map: PiecesDiff = new Map();

            const square = `${dest[0]}${Number(dest[1]) - 1}` as Key;

            map.set(square, undefined);

            api.setPieces(map);
          }

          api.set({
            viewOnly: isViewOnly || isCheckmate(),
            turnColor: turn(),
            check: isCheck(),
            movable: {
              free: false,
              color: side || undefined,
              dests: dests(),
            },
          });

          handleMoveMaking({engine, api, orig, dest, capturedPiece});

          api.playPremove();
        },
      },
    });

    handleBoardLoad({engine, api});
  }, []);

  return <Box w="full" h="full" ref={groundRef} />;
};
