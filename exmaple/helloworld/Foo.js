import { h } from "../../lib/mini-vue.esm.js";
export const Foo = {
    render() {
        return h("div", { class: "foo" }, "foo: " + this.count);
    },
    setup(props) {
        const { count } = props;
        props.count = 888;
        console.log(count);
        return {};
    },
};
