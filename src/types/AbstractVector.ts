export abstract class AbstractVector<P extends { [key in K]: number }, K extends string> {
    constructor() {
    }

    add(p: number): P;
    add(p: P): P;
    add(p: number | P): P {
        return typeof p === "number"
            ? this.map(n => n + p)
            : this.calc(p, (a, b) => a + b);
    }

    sub(p: number): P;
    sub(p: P): P;
    sub(p: number | P): P {
        return typeof p === "number"
            ? this.map(n => n - p)
            : this.calc(p, (a, b) => a - b);
    }

    times(p: number): P;
    times(p: P): P;
    times(p: number | P): P {
        return typeof p === "number"
            ? this.map(n => n * p)
            : this.calc(p, (a, b) => a * b);
    }

    div(p: number): P;
    div(p: P): P;
    div(p: number | P): P {
        return typeof p === "number"
            ? this.map(n => n / p)
            : this.calc(p, (a, b) => a / b);
    }

    iDivP(to: P, t: number): P {
        return this.calc(to, (a, b) => (1 - t) * a + t * b);
    }

    abstract distance(p: P): number;

    abstract map(f: (element: number) => number): P;

    abstract calc<B extends Record<K, unknown>>(b: B, f: (a: number, b: B[K]) => number): P;
    abstract calc<B extends Record<K, unknown>, C extends Record<K, unknown>>(b: B, c: C, f: (a: number, b: B[K], c: C[K]) => number): P;
    abstract calc<B extends Record<K, unknown>, C extends Record<K, unknown>>(b: B, c: C | ((a: number, b: B[K]) => number), f?: (a: number, b: B[K], c: C[K]) => number): P;

    abstract update(...f: ((...dimensions: number[]) => number)[]): P;

    abstract clone(): P;

    abstract toString(): string;
}
