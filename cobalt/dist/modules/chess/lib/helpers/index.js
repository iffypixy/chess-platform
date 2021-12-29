"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeControlToCategory = void 0;
const chess_1 = require("../..");
const constants_1 = require("../constants");
const timeControlToCategory = ({ time, delay, increment }) => {
    const overall = (time + delay * 45 + increment * 45) / 1000;
    if (overall <= 2)
        return constants_1.CHESS_CATEGORIES.BULLET;
    else if (overall <= 7)
        return constants_1.CHESS_CATEGORIES.BLITZ;
    else if (overall <= 20)
        return constants_1.CHESS_CATEGORIES.RAPID;
    else if (overall > 20)
        return constants_1.CHESS_CATEGORIES.CLASSICAL;
};
exports.timeControlToCategory = timeControlToCategory;
//# sourceMappingURL=index.js.map