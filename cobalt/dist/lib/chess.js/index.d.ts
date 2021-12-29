declare var Chess: (fen: any) => {
    WHITE: string;
    BLACK: string;
    PAWN: string;
    KNIGHT: string;
    BISHOP: string;
    ROOK: string;
    QUEEN: string;
    KING: string;
    SQUARES: any[];
    FLAGS: {
        NORMAL: string;
        CAPTURE: string;
        BIG_PAWN: string;
        EP_CAPTURE: string;
        PROMOTION: string;
        KSIDE_CASTLE: string;
        QSIDE_CASTLE: string;
    };
    load: (fen: any) => boolean;
    reset: () => void;
    moves: (options: any) => any[];
    in_check: () => boolean;
    in_checkmate: () => boolean;
    in_stalemate: () => boolean;
    in_draw: () => boolean;
    insufficient_material: () => boolean;
    in_threefold_repetition: () => boolean;
    game_over: () => boolean;
    validate_fen: (fen: any) => {
        valid: boolean;
        error_number: number;
        error: string;
    };
    fen: () => string;
    board: () => any[];
    pgn: (options: any) => string;
    load_pgn: (pgn: any, options: any) => boolean;
    header: () => {};
    ascii: () => string;
    turn: () => string;
    move: (move: any, options: any) => {};
    undo: () => {};
    clear: () => void;
    put: (piece: any, square: any) => boolean;
    get: (square: any) => {
        type: any;
        color: any;
    };
    remove: (square: any) => {
        type: any;
        color: any;
    };
    perft: (depth: any) => number;
    square_color: (square: any) => "light" | "dark";
    history: (options: any) => any[];
    get_comment: () => any;
    set_comment: (comment: any) => void;
    delete_comment: () => any;
    get_comments: () => {
        fen: string;
        comment: any;
    }[];
    delete_comments: () => {
        fen: string;
        comment: any;
    }[];
};
