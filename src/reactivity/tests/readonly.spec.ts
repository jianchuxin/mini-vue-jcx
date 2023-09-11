import { isReadonly, readonly, isProxy } from "../reactive";
describe("readonly", () => {
    it("happy path", () => {
        const obj = { foo: 1, bar: { baz: 2 } };
        const target = readonly(obj);
        expect(target).not.toBe(obj);
        expect(target.foo).toBe(1);
        // 测试isReadonly
        expect(isReadonly(target)).toBe(true);
        expect(isProxy(target)).toBe(true);
        expect(isReadonly(obj)).toBe(false);
    });

    it("warn when set", () => {
        console.warn = jest.fn();
        const obj = readonly({ foo: 1 });
        obj.foo = 2;
        expect(console.warn).toHaveBeenCalled();
    });

    it("nest readonly", () => {
        const obj = {
            foo: 1,
            bar: {
                baz: 1,
            },
        };

        const target = readonly(obj);
        expect(isReadonly(target)).toBe(true);
        expect(isReadonly(obj)).toBe(false);
        expect(isReadonly(target.bar)).toBe(true);
        expect(isReadonly(obj.bar)).toBe(false);
        expect(isReadonly(target.foo)).toBe(false);
    });
});
