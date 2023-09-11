import { ref, isRef, unRef, proxyRefs } from "../ref";
import { effect } from "../effect";
import { isReactive } from "../reactive";
describe("ref", () => {
    it("happy path", () => {
        const a = ref(1);
        expect(a.value).toBe(1);
    });

    it("should be reactive", () => {
        const a = ref(1);
        let dummy;
        let calls = 0;
        effect(() => {
            calls++;
            dummy = a.value;
        });
        expect(calls).toBe(1);
        expect(dummy).toBe(1);
        a.value = 2;
        expect(calls).toBe(2);
        expect(dummy).toBe(2);
        // same value should not trigger
        a.value = 2;
        expect(calls).toBe(2);
        expect(dummy).toBe(2);
    });

    it("nested object should be reactive", () => {
        const obj = ref({ age: 20 });
        expect(isReactive(obj.value)).toBe(true);
    });

    it("same object should not trigger", () => {
        const obj1 = { age: 10 };
        const obj2 = obj1;
        const target = ref(obj1);
        let dummy;
        let calls = 0;
        effect(() => {
            calls++;
            dummy = target.value;
        });
        expect(calls).toBe(1);
        target.value = obj2;
        expect(calls).toBe(1);
    });

    it("isRef and unRef", () => {
        const a = ref(1);
        expect(isRef(a)).toBe(true);
        expect(isRef(1)).toBe(false);
        expect(unRef(a)).toBe(1);
        expect(unRef(1)).toBe(1);
    });

    it("proxyRefs", () => {
        const user = {
            age: ref(10),
            name: "jane",
        };
        const proxyUser = proxyRefs(user);
        expect(user.age.value).toBe(10);
        expect(proxyUser.age).toBe(10);
        expect(proxyUser.name).toBe("jane");
    });
});
