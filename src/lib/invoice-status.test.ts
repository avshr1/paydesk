import { describe, expect, it } from "vitest";
import {
  canTransition,
  isEditable,
  isPastDue,
  shouldMarkOverdue,
} from "@/lib/invoice-status";

describe("canTransition", () => {
  it.each([
    ["DRAFT", "SENT"],
    ["SENT", "PAID"],
    ["SENT", "OVERDUE"],
    ["OVERDUE", "PAID"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["DRAFT", "PAID"],
    ["SENT", "DRAFT"],
    ["OVERDUE", "SENT"],
    ["PAID", "SENT"],
    ["PAID", "DRAFT"],
  ] as const)("blocks %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe("isEditable", () => {
  it("only allows editing drafts", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("SENT")).toBe(false);
    expect(isEditable("OVERDUE")).toBe(false);
    expect(isEditable("PAID")).toBe(false);
  });
});

describe("isPastDue", () => {
  const dueDate = new Date("2026-11-15T00:00:00Z");

  it("is not past due on the due date itself", () => {
    expect(isPastDue(dueDate, new Date("2026-11-15T23:59:59Z"))).toBe(false);
  });

  it("is past due the day after", () => {
    expect(isPastDue(dueDate, new Date("2026-11-16T00:00:00Z"))).toBe(true);
  });
});

describe("shouldMarkOverdue", () => {
  const dueDate = new Date("2026-11-15T00:00:00Z");
  const later = new Date("2026-11-20T12:00:00Z");

  it("marks late sent invoices", () => {
    expect(shouldMarkOverdue({ status: "SENT", dueDate }, later)).toBe(true);
  });

  it("ignores drafts, paid, and already-overdue invoices", () => {
    expect(shouldMarkOverdue({ status: "DRAFT", dueDate }, later)).toBe(false);
    expect(shouldMarkOverdue({ status: "PAID", dueDate }, later)).toBe(false);
    expect(shouldMarkOverdue({ status: "OVERDUE", dueDate }, later)).toBe(
      false,
    );
  });

  it("ignores sent invoices that aren't due yet", () => {
    const early = new Date("2026-11-10T12:00:00Z");
    expect(shouldMarkOverdue({ status: "SENT", dueDate }, early)).toBe(false);
  });
});
