import { extend } from "../shared/index";

let activeEffect;
let shouldTrack = true;
let targetsMap = new Map();

export class ReactiveEffect {
    private _fn: any;
    private active = true;
    public deps: any = [];
    onStop = () => {};
    public scheduler: Function | undefined;
    constructor(fn, scheduler?: Function) {
        this._fn = fn;
        this.scheduler = scheduler;
    }

    run() {
        if (!this.active) {
            return this._fn();
        }
        // 应该收集
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn(); // 函数执行，会触发get收集依赖
        // reset
        shouldTrack = false;
        return result; // runner 返回fn的返回值
    }

    stop() {
        // 删除dep set 中的effect实例
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
            if (this.onStop) {
                this.onStop();
            }
        }
    }
}

export function effect(fn, options: any = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // _effect.onStop = options.onStop;
    extend(_effect, options);
    _effect.run();
    const runner: any = _effect.run.bind(_effect); // 返回runner
    runner.effect = _effect;
    return runner;
}

export function stop(runner) {
    runner.effect.stop();
}

function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps = [];
}

export function isTracking() {
    // 在effect之前直接get会导致activeEffect为undefined
    // 在stop之后get会导致shouldTrack为false
    return shouldTrack && activeEffect !== undefined;
}

export function track(target, key) {
    if (!isTracking()) return;

    let depsMap = targetsMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetsMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }

    trackEffect(dep);
}

export function trackEffect(dep) {
    // 已经在dep中不必收集
    if (dep.has(activeEffect)) return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}

export function trigger(target, key) {
    let depsMap = targetsMap.get(target);
    let dep = depsMap.get(key);
    triggerEffect(dep);
}

export function triggerEffect(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        } else {
            effect.run();
        }
    }
}
