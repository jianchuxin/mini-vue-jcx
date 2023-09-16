// 返回一个 AST
// 创建一个全局上下文对象 context， 返回一个对象
// 创建一个根节点，里面有children

import { NodeTypes } from "./ast";

const enum LabelTypes {
    START,
    END,
}

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
    const s = context.source;

    if (s.startsWith("{{")) {
        node = parseInterpolation(context);
    } else if (s.startsWith("<")) {
        // TODO 解析ELEMENT类型
        if (/[a-z]/i.test(s[1])) {
            node = praseElement(context);
        }
    }

    if (!node) {
        node = praseText(context);
    }

    nodes.push(node);

    return nodes;
}

// 解析文本
function praseText(context) {
    const content = parseTextData(context, context.source.length);
    return {
        type: NodeTypes.TEXT,
        content,
    };
}

function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, content.length);
    return content;
}
// 截取获得 tag
// source 移进
function praseElement(context) {
    // 处理开始标签
    const node = praseTag(context);
    // 处理结束标签
    praseTag(context, LabelTypes.END);
    return node;
}

function praseTag(context, labelType?) {
    // 处理开始标签 和 结束标签
    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (labelType === LabelTypes.END) return;
    return {
        type: NodeTypes.ELEMENT,
        tag,
    };
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

    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();

    advanceBy(context, closeDelimiter.length);

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content,
        },
    };
}

function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
