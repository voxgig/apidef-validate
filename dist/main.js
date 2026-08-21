"use strict";
/* Copyright (c) 2025 Voxgig Ltd, MIT License */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Diff = void 0;
exports.main = main;
exports.makefs = makefs;
const fs = __importStar(require("fs"));
const memfs_1 = require("memfs");
const unionfs_1 = require("unionfs");
const Diff = __importStar(require("diff"));
exports.Diff = Diff;
function main() {
    return "main";
}
function makefs(vol) {
    const ufs = new unionfs_1.Union();
    const mem = (0, memfs_1.memfs)(vol);
    // ORDER IS THE SANDBOX. unionfs gives precedence to the LAST fs registered,
    // so the in-memory fs must be registered last, not first.
    //
    // Registered the other way round the real fs won every write: jostraca's
    // FileHandler starts with `fs().mkdirSync(dir, {recursive: true})`, that
    // landed on the host, and every file written into the directory followed it
    // there. The generated output then never appeared in `vol`, so the golden
    // comparisons read `undefined` and every case failed before a single golden
    // was compared.
    //
    // It survived because the damage is privilege-dependent, not because it
    // worked. The case paths are rooted at `/model`, which an ordinary user
    // cannot create: the real-fs write failed with EACCES, unionfs silently
    // fell through to the memory fs, and the suite passed. Run as root — in a
    // container, in CI — the real write succeeds instead, and the run writes
    // thousands of files to the host filesystem while reporting failure.
    //
    // Reads are unaffected: a path missing from the memory fs still falls
    // through to the real one, which is how the def files are loaded.
    ufs.use(fs).use(mem.fs);
    ufs.__mem__ = true;
    ufs.__vol__ = mem.vol;
    return { fs: ufs, vol: mem.vol };
}
//# sourceMappingURL=main.js.map