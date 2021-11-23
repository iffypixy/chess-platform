import os from "os";
import cluster from "cluster";

export class Cluster {
  static register(cb: Function): void {
    if (cluster.isPrimary) {
      const cpus = os.cpus().length;

      for (let i = 0; i < cpus; i++) {
        cluster.fork();
      }
    } else if (cluster.isWorker) {
      cb();
    }
  }
}
