import { expect } from "chai";
import { describe, it } from "node:test";
import { isLeapYear } from "#leap";

describe("leap", () => {
    it("is a leap year", () => {
        expect(isLeapYear(2000)).to.be.true
    })
})