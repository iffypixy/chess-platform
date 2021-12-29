"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cluster = void 0;
const os_1 = require("os");
const cluster_1 = require("cluster");
class Cluster {
    static register(cb) {
        if (cluster_1.default.isPrimary) {
            const cpus = os_1.default.cpus().length;
            for (let i = 0; i < cpus; i++) {
                cluster_1.default.fork();
            }
        }
        else if (cluster_1.default.isWorker) {
            cb();
        }
    }
}
exports.Cluster = Cluster;
//# sourceMappingURL=index.js.map