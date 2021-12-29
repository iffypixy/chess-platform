"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elo = void 0;
const constants_1 = require("./constants");
const calculateVictory = ({ winner, loser }) => {
    const difference = loser - winner;
    const shift = Math.round(difference / 20);
    const change = Math.max(1, constants_1.MATCHMAKING.RATING_GAIN + shift);
    return {
        winner: winner + change,
        loser: loser - change,
        shift: change,
    };
};
const calculateDraw = ({ underdog, favourite }) => {
    const difference = Math.abs(underdog - favourite);
    const shift = Math.round(difference / 20);
    return {
        underdog: underdog + shift,
        favourite: favourite - shift,
        shift,
    };
};
exports.elo = {
    calculateDraw,
    calculateVictory,
};
//# sourceMappingURL=elo.js.map