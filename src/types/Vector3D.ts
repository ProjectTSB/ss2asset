import { AbstractVector } from './AbstractVector';

type Axis = 'x' | 'y' | 'z';
type Vector3DLike = Record<Axis, unknown>;

export class Vector3D extends AbstractVector<Vector3D, Axis> {
    constructor(public readonly x: number, public readonly y: number, public readonly z: number) {
        super();
    }

    distance(p: Vector3D): number {
        return Math.sqrt((this.x - p.x) ** 2 + (this.y - p.y) ** 2 + (this.z - p.z) ** 2);
    }

    calc<B extends Vector3DLike>(b: B, f: (a: number, b: B[Axis]) => number): Vector3D;
    calc<B extends Vector3DLike, C extends Vector3DLike>(b: B, c: C, f: (a: number, b: B[Axis], c: C[Axis]) => number): Vector3D;
    calc<B extends Vector3DLike, C extends Vector3DLike>(b: B, c: C | ((a: number, b: B[Axis]) => number), f?: (a: number, b: B[Axis], c: C[Axis]) => number): Vector3D {
        if (typeof c === 'function')
            return new Vector3D(c(this.x, b.x), c(this.y, b.y), c(this.z, b.z));
        if (typeof f === 'function')
            return new Vector3D(f(this.x, b.x, c.x), f(this.y, b.y, c.y), f(this.z, b.z, c.z));
        throw Error('Illegal argument error.');
    }

    setX(x: number): Vector3D {
        return new Vector3D(x, this.y, this.z);
    }

    setY(y: number): Vector3D {
        return new Vector3D(this.x, y, this.z);
    }

    setZ(z: number): Vector3D {
        return new Vector3D(this.x, this.y, z);
    }

    map(f: (element: number) => number): Vector3D {
        return new Vector3D(f(this.x), f(this.y), f(this.z));
    }

    update(
        fx: (x: number, y: number, z: number) => number,
        fy: (x: number, y: number, z: number) => number,
        fz: (x: number, y: number, z: number) => number
    ): Vector3D {
        return new Vector3D(fx(this.x, this.y, this.z), fy(this.x, this.y, this.z), fz(this.x, this.y, this.z));
    }

    updateX(f: (x: number) => number): Vector3D {
        return new Vector3D(f(this.x), this.y, this.z);
    }

    updateY(f: (y: number) => number): Vector3D {
        return new Vector3D(this.x, f(this.y), this.z);
    }

    updateZ(f: (y: number) => number): Vector3D {
        return new Vector3D(this.x, this.y, f(this.z));
    }

    clone(): Vector3D {
        return new Vector3D(this.x, this.y, this.z);
    }

    toString(): string {
        return `${this.x}, ${this.y}, ${this.z}`;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly ZERO: Vector3D = new Vector3D(0, 0, 0);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly MIN: Vector3D = new Vector3D(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly MAX: Vector3D = new Vector3D(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
}