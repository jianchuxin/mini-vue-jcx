import { isReadonly, shallowReadonly } from "../reactive";

describe("shallowReadonly", () => {
    it("shallow reactive", () => {
        const props = shallowReadonly({ n: { foo: 1 } });
        expect(isReadonly(props)).toBe(true);
        expect(isReadonly(props.n)).toBe(false);
        console.warn = jest.fn();
        props.n.foo = 2;
        expect(console.warn).not.toHaveBeenCalled();
    });
});
