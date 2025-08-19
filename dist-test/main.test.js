"use strict";
/* Copyright (c) 2025 Voxgig Ltd, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const code_1 = require("@hapi/code");
const __1 = require("..");
(0, node_test_1.describe)('main', () => {
    (0, node_test_1.test)('happy', async () => {
        (0, code_1.expect)((0, __1.main)()).equal('main');
    });
});
//# sourceMappingURL=main.test.js.map