export * from "./runtime-dom";
import { baseCompile } from "./compiler-core/src";

import * as Vue from "./runtime-dom";
import { registerCompiler } from "./runtime-dom";

function compileToFunction(template) {
    const { code } = baseCompile(template);
    return new Function("Vue", code)(Vue);
}

//把compiler 注入 到 runtime-core 中
registerCompiler(compileToFunction);
