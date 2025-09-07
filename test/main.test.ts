import { assert, describe, expect, it, beforeAll } from "vitest";
import { take } from "rxjs";
import {
    state$,
    tick,
    flap,
    parseCsv,
    handleCollisions,
    initialState,
    Constants,
    Viewport,
} from "../src/main";

beforeAll(() => {
    globalThis.document = {
        addEventListener: () => {},
        removeEventListener: () => {},
    } as unknown as Document;
});

describe("exports", () => {
    it("state$ is defined and is a function", () => {
        assert.isDefined(state$);
        assert.isFunction(state$);
    });
    it("tick, flap, parseCsv, handleCollisions are functions", () => {
        assert.isFunction(tick);
        assert.isFunction(flap);
        assert.isFunction(parseCsv);
        assert.isFunction(handleCollisions);
    });
});

describe("tick()", () => {
    it("applies gravity", () => {
        const s = { ...initialState, vel: 0, posY: 100 };
        const s2 = tick(s);
        expect(s2.vel).toBe(s.vel + Constants.GRAVITY);
        expect(s2.posY).toBe(s.posY + s2.vel);
    });

    it("removes pipes that move off screen", () => {
        const pipe = {
            x: -Constants.PIPE_WIDTH - 1,
            gapY: 200,
            gapHeight: 100,
            scored: false,
        };
        const s = { ...initialState, pipes: [pipe] };
        const s2 = tick(s);
        expect(s2.pipes.length).toBe(0);
    });

    it("increments score when bird passes a pipe", () => {
        const pipe = { x: 0, gapY: 200, gapHeight: 100, scored: false };
        const s = {
            ...initialState,
            pipes: [pipe],
            posY: 200,
            score: 0,
        };
        const s2 = tick(s);
        expect(s2.score).toBe(1);
        expect(s2.pipes[0].scored).toBe(true);
    });

    it("reduces lives and ends game when lives reach 0", () => {
        const pipe = {
            x: Viewport.CANVAS_WIDTH * 0.3,
            gapY: 200,
            gapHeight: 10,
            scored: false,
        };
        const s = { ...initialState, lives: 1, posY: 0, pipes: [pipe] };
        const s2 = tick(s);
        expect(s2.lives).toBe(0);
        expect(s2.gameEnd).toBe(true);
    });

    it("does not change state if game has ended", () => {
        const s = { ...initialState, gameEnd: true };
        const s2 = flap(s);
        expect(s2).toBe(s);
    });
});

describe("flap()", () => {
    it("sets upward velocity", () => {
        const s = { ...initialState, vel: 0, posY: 100 };
        const s2 = flap(s);
        expect(s2.vel).toBe(Constants.FLAP);
    });
    it("does not change state if game has ended", () => {
        const s = { ...initialState, gameEnd: true };
        const s2 = flap(s);
        expect(s2).toBe(s);
    });
});

describe("parseCsv()", () => {
    it("parses CSV into IncomingPipes and trims whitespace", () => {
        const csv = "gapY,gapHeight,time\n   0.5  , 0.25 , 1  ";
        const result = parseCsv(csv);
        expect(result[0].gapY).toBe(Viewport.CANVAS_HEIGHT * 0.5);
        expect(result[0].gapHeight).toBe(Viewport.CANVAS_HEIGHT * 0.25);
        expect(result[0].time).toBe(1000);
    });
});

describe("handleCollision()", () => {
    it("returns null when no collision", () => {
        const s = { ...initialState, posY: 200, pipes: [] };
        expect(handleCollisions(s)).toBeNull();
    });

    it("detects collision with ceiling", () => {
        const s = { ...initialState, posY: 0, pipes: [] };
        const result = handleCollisions(s);
        expect(result).toBeGreaterThan(0); // bounceDown
    });

    it("detects collision with floor", () => {
        const s = { ...initialState, posY: Viewport.CANVAS_HEIGHT, pipes: [] };
        const result = handleCollisions(s);
        expect(result).toBeLessThan(0); // bounceUp
    });

    it("detects collision with top of pipe gap", () => {
        const pipe = {
            x: Viewport.CANVAS_WIDTH * 0.3 - 10, // so birdX is inside
            gapY: 200,
            gapHeight: 50,
            scored: false,
        };
        const s = { ...initialState, posY: 150, pipes: [pipe] }; // above gap
        const result = handleCollisions(s);
        expect(result).toBeGreaterThan(0); // bounceDown
    });

    it("detects collision with bottom of pipe gap", () => {
        const pipe = {
            x: Viewport.CANVAS_WIDTH * 0.3 - 10,
            gapY: 200,
            gapHeight: 50,
            scored: false,
        };
        const s = { ...initialState, posY: 260, pipes: [pipe] }; // below gap
        const result = handleCollisions(s);
        expect(result).toBeLessThan(0); // bounceUp
    });
});

describe("state$ observable", () => {
    it("emits initial state and updates over time", async () => {
        const csv = "gapY,gapHeight,time\n0.5,0.25,0";
        const emitted: any[] = [];

        await new Promise<void>(resolve => {
            state$(csv)
                .pipe(take(3))
                .subscribe({
                    next: s => emitted.push(s),
                    complete: () => {
                        expect(emitted.length).toBe(3);
                        expect(emitted[0].pipesRemaining).toBeDefined();
                        resolve();
                    },
                });
        });
    });

    it("resets state on restart but keeps ghosts", async () => {
        const csv = "gapY,gapHeight,time\n0.5,0.25,0";
        const emitted: any[] = [];

        await new Promise<void>(resolve => {
            state$(csv)
                .pipe(take(2))
                .subscribe({
                    next: s => emitted.push(s),
                    complete: () => {
                        expect(emitted[1].previousRuns).toBeDefined();
                        resolve();
                    },
                });
        });
    });

    it("resets lives, score, and position on restart", async () => {
        const csv = "gapY,gapHeight,time\n0.5,0.25,0";
        const emitted: any[] = [];

        await new Promise<void>(resolve => {
            state$(csv)
                .pipe(take(2))
                .subscribe({
                    next: s => emitted.push(s),
                    complete: () => {
                        const restart = emitted[1];
                        expect(restart.lives).toBeDefined();
                        expect(restart.score).toBeDefined();
                        expect(restart.posY).toBeDefined();
                        resolve();
                    },
                });
        });
    });
});
