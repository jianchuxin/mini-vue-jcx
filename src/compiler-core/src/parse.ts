// 返回一个 AST
// 创建一个全局上下文对象 context， 返回一个对象
// 创建一个根节点，里面有children

import { NodeTypes } from "./ast";

// 解析 context， 返回children
export function baseParse(content: string) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context));
}

// 开始
function createParserContext(content: string) {
    return {
        source: content,
    };
}

// 返回
function createRoot(children) {
    return {
        children,
    };
}

// 解析context，生成节点的children，
// 解析 context 中的插值，
function parseChildren(context) {
    const nodes: any = [];

    let node;
    if (context.source.startsWith("{{")) {
        node = parseInterpolation(context);
    }

    nodes.push(node);

    return nodes;
}

// 截取出插值
// 处理完后 推进source，删除之前处理好的
// 后面还有数据待处理
// 可能有多种分隔符，距离不一定是2，所以需要重构
function parseInterpolation(context) {
    // source {{message}} --> message
    const openDelimiter = "{{";
    const closeDelimiter = "}}";

    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);

    advanceBy(context, openDelimiter.length);

    const rawContentLength = closeIndex - openDelimiter.length;

    const rawContent = context.source.slice(0, rawContentLength);
    const content = rawContent.trim();

    advanceBy(context, rawContentLength + closeDelimiter.length);

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        },
    };
}

function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
