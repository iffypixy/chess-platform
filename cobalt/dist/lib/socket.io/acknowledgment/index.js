"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgment = void 0;
exports.acknowledgment = {
    ok: (options = {}) => (Object.assign({ status: "ok" }, options)),
    error: (options = {}) => (Object.assign({ status: "error" }, options)),
};
//# sourceMappingURL=index.js.map