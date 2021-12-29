interface CalculateVictoryData {
    winner: number;
    loser: number;
}
interface CalculateVictoryReturn {
    winner: number;
    loser: number;
    shift: number;
}
interface CalculateDrawData {
    underdog: number;
    favourite: number;
}
interface CalculateDrawReturn {
    underdog: number;
    favourite: number;
    shift: number;
}
export declare const elo: {
    calculateDraw: ({ underdog, favourite }: CalculateDrawData) => CalculateDrawReturn;
    calculateVictory: ({ winner, loser }: CalculateVictoryData) => CalculateVictoryReturn;
};
export {};
