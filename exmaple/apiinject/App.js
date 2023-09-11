import { h } from "../../lib/mini-vue.esm.js";
import { provide, inject } from "../../lib/mini-vue.esm.js";
const Provider = {
    name: "Provider",
    setup() {
        provide("foo", "fooValue");
        provide("bar", "barValue");
    },

    render() {
        return h("div", {}, [h("p", {}, "Provider"), h(ProviderTwo)]);
    },
};

const ProviderTwo = {
    name: "ProviderTwo",
    setup() {
        provide("foo", "fooTwo");
        const foo = inject("foo");
        return { foo };
    },

    render() {
        return h("div", {}, [
            h("p", {}, "ProviderTwo- " + this.foo),
            h(Consumer),
        ]);
    },
};

const Consumer = {
    name: "Consumer",
    setup() {
        const foo = inject("foo");
        const bar = inject("bar");
        const baz = inject("baz", () => "bazResult");

        return { foo, bar, baz };
    },
    render() {
        return h(
            "div",
            {},
            `Consumer: - ${this.foo} - ${this.bar} - ${this.baz}`
        );
    },
};

export default {
    name: "App",
    setup() {},
    render() {
        return h("div", {}, [h("p", {}, "apiInject"), h(Provider)]);
    },
};
