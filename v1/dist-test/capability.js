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
exports.graphqlCapable = graphqlCapable;
const Fs = __importStar(require("node:fs"));
// GraphQL ingestion landed after some published @voxgig/apidef versions, so
// the installed copy may not understand those cases at all. Detect the
// capability from the shipped model rather than by version arithmetic: a
// pre-GraphQL apidef simply has no graphql block in its point schema.
//
// SHARED BECAUSE THE DUPLICATE DRIFTED. main.test.ts and bench.ts both need
// this probe, and when apidef renamed `model/apidef.aontu` to `.aon` only
// one copy was updated. The other went on resolving the old name, threw
// MODULE_NOT_FOUND straight into its own catch, and reported "not capable"
// — so every GraphQL case vanished from the benchmark with nothing logged.
// A probe whose failure mode is silent must not exist twice.
function graphqlCapable() {
    for (const ext of ['aon', 'aontu']) {
        try {
            const modelPath = require.resolve(`@voxgig/apidef/model/apidef.${ext}`);
            return Fs.readFileSync(modelPath, 'utf8').includes("'graphql'");
        }
        catch (err) {
            // Wrong extension for this apidef, or unreadable. Try the other; if
            // neither resolves, apidef predates GraphQL and false is correct.
        }
    }
    return false;
}
//# sourceMappingURL=capability.js.map