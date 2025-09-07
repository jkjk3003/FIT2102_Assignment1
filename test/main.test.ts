import { assert, describe, expect, it } from "vitest";
import { tick, flap, initialState, Constants, state$ } from "../src/main";
import { take } from "rxjs/operators";

// ---------- Smoke Tests ----------
describe("state$", () => {
    it("is defined", () => {
        assert.isDefined(state$);
    });

    it("is a function", () => {
        assert.isFunction(state$);
    });
});

// ---------- Reducer Logic Tests ----------
describe("tick", () => {
    it("applies gravity and updates position", () => {
        const s = { ...initialState, posY: 100, vel: 0 };
        const s2 = tick(s);

        expect(s2.vel).toBe(s.vel + Constants.GRAVITY);
        expect(s2.posY).toBe(s.posY + s2.vel);
    });

    it("does nothing when gameEnd is true", () => {
        const s = { ...initialState, gameEnd: true, posY: 100 };
        const s2 = tick(s);

        expect(s2.posY).toBe(s.posY); // unchanged
        expect(s2.vel).toBe(s.vel);
    });
});

describe("flap", () => {
    it("sets velocity to FLAP constant", () => {
        const s = { ...initialState, vel: 5 };
        const s2 = flap(s);

        expect(s2.vel).toBe(Constants.FLAP);
    });

    it("does nothing when gameEnd is true", () => {
        const s = { ...initialState, gameEnd: true, vel: 5 };
        const s2 = flap(s);

        expect(s2.vel).toBe(5);
    });
});

// ---------- Observable Integration Test ----------
describe("state$ observable", () => {
    it("emits initial state with pipesRemaining", async () => {
        const csv = "gapY,gapHeight,time\n0.5,0.2,0"; // single pipe
        const emitted: any[] = [];

        await new Promise<void>(resolve => {
            state$(csv)
                .pipe(take(1))
                .subscribe({
                    next: s => {
                        emitted.push(s);
                        resolve();
                    },
                });
        });

        expect(emitted[0].pipesRemaining).toBe(1);
        expect(emitted[0].posY).toBe(initialState.posY);
    });
});
