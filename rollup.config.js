import pkg from "./package.json" assert { type: "json" };
import typescript from "@rollup/plugin-typescript";
export default {
    input: "./src/index.ts",
    output: [
        {
            file: pkg.main,
            format: "cjs",
        },
        {
            file: pkg.module,
            format: "es",
        },
    ],

    plugins: [typescript()],
};
