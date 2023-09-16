import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";
describe("Parse", () => {
    describe("interpolation", () => {
        it("simple interpolation", () => {
            const ast = baseParse("{{ message }}");

            // root
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.INTERPOLATION,
                content: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: "message",
                },
            });
            //
        });
    });

    describe("element", () => {
        it("element type", () => {
            const ast = baseParse("<div></div>");

            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.ELEMENT,
                tag: "div",
            });
        });
    });
});