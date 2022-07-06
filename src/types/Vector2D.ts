import { AbstractVector } from './AbstractVector';

type Axis = 'x' | 'y';
type Vector2DLike = Record<Axis, unknown>;

export class Vector2D extends AbstractVector<Vector2D, Axis> {
    constructor(public readonly x: number, public readonly y: number) {
        super();
    }

    override distance(p: Vector2D): number {
        return Math.sqrt((this.x - p.x) ** 2 + (this.y - p.y) ** 2);
    }

    override calc<B extends Vector2DLike>(b: B, f: (a: number, b: B[Axis]) => number): Vector2D;
    override calc<B extends Vector2DLike, C extends Vector2DLike>(b: B, c: C, f: (a: number, b: B[Axis], c: C[Axis]) => number): Vector2D;
    override calc<B extends Vector2DLike, C extends Vector2DLike>(b: B, c: C | ((a: number, b: B[Axis]) => number), f?: (a: number, b: B[Axis], c: C[Axis]) => number): Vector2D {
        if (typeof c === 'function')
            return new Vector2D(c(this.x, b.x), c(this.y, b.y));
        if (typeof f === 'function')
            return new Vector2D(f(this.x, b.x, c.x), f(this.y, b.y, c.y));
        throw Error('Illegal argument error.');
    }

    setX(x: number): Vector2D {
        return new Vector2D(x, this.y);
    }

    setY(y: number): Vector2D {
        return new Vector2D(this.x, y);
    }

    override map(f: (element: number) => number): Vector2D {
        return new Vector2D(f(this.x), f(this.y));
    }

    override update(fx: ((x: number, y: number) => number), fy: ((x: number, y: number) => number)): Vector2D {
        return new Vector2D(fx(this.x, this.y), fy(this.x, this.y));
    }

    updateX(f: (x: number) => number): Vector2D {
        return new Vector2D(f(this.x), this.y);
    }

    updateY(f: (y: number) => number): Vector2D {
        return new Vector2D(this.x, f(this.y));
    }

    override clone(): Vector2D {
        return new Vector2D(this.x, this.y);
    }

    override toString(): string {
        return `${this.x} ${this.y}`;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly ZERO: Vector2D = new Vector2D(0, 0);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly MIN: Vector2D = new Vector2D(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly MAX: Vector2D = new Vector2D(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
}