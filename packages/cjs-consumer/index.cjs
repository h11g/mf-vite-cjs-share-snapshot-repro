"use strict";
// The shape tsc emits for `import _ from "lodash"` under esModuleInterop.
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
exports.doubled = function (obj) {
  return lodash_1.default.transform(obj, function (acc, value, key) { acc[key] = value * 2; }, {});
};
