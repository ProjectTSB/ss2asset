export class Id<A> {
    private constructor(private readonly value: A) { }

    static apply<A>(value: A): Id<A> {
        return new Id(value);
    }

    map<B>(f: (value: A) => B): Id<B> {
        return Id.apply(f(this.value));
    }

    flatMap<B>(f: (value: A) => Id<B>): Id<B> {
        return f(this.value);
    }

    get(): A {
        return this.value;
    }

    foreach<V>(f: (value: A) => V): Id<A> {
        f(this.value);
        return this;
    }
}