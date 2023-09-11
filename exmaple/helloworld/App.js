import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";
window.self = null;
export const App = {
    // .vue 中有template， 会把template 编译为render函数中的内容·
    render() {
        self = this;
        // 返回一个虚拟节点 vnode
        // return h("div", { class: "a,b,c,d" }, [
        //     h("h1", { class: "a" }, "nihao"),
        //     h("h3", { class: "b" }, "are you ok?"),
        // ]);

        // 实现this， 包括state、$el、$data等内容
        // 使用 this.msg, 需要将render函数的指针绑定到setup返回的对象上, 借助proxy
        // 使用 $el, 表示组件实例管理的根节点
        return h(
            "div",
            {
                class: "a",
                onMouseDown: () => {
                    console.log("mousedown!");
                },
            },
            [h("div", { class: "bro" }, "你好 foo"), h(Foo, { count: 777 })]
        );
    },

    setup() {
        // composition API
        return {
            msg: "mini-vue",
        };
    },
};
