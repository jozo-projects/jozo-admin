import { describe, expect, it } from "vitest";
import { IServedStreakGift } from "@/@types/Membership";
import {
  buildInvoiceGiftLines,
  getServedGiftRemainingQuota,
  toPaidBillItems,
} from "./billGiftItems";

const servedGift = (
  overrides: Partial<IServedStreakGift> = {},
): IServedStreakGift => ({
  streakCount: 3,
  itemCount: 2,
  usedQuantity: 1,
  remainingQuantity: 1,
  items: [
    {
      itemId: "coca",
      name: "Coca",
      category: "drinks",
      quantity: 1,
    },
  ],
  ...overrides,
});

describe("buildInvoiceGiftLines", () => {
  it("builds editable lines from served gifts", () => {
    const lines = buildInvoiceGiftLines([servedGift()]);

    expect(lines).toEqual([
      {
        key: "3-coca",
        itemId: "coca",
        name: "Coca",
        category: "drinks",
        quantity: 1,
        streakCount: 3,
        remainingQuota: 1,
        canEdit: true,
      },
    ]);
  });

  it("falls back to bill gift items when served gift has no items", () => {
    const lines = buildInvoiceGiftLines(
      [servedGift({ items: [] })],
      {
        items: [
          {
            itemId: "pepsi",
            name: "Pepsi",
            quantity: 2,
            source: "fnb_menu",
          },
        ],
      },
    );

    expect(lines).toEqual([
      expect.objectContaining({
        itemId: "pepsi",
        name: "Pepsi",
        quantity: 2,
        streakCount: 3,
        canEdit: true,
      }),
    ]);
  });

  it("keeps bill gift items display-only when there is no served gift", () => {
    const lines = buildInvoiceGiftLines([], {
      items: [
        {
          itemId: "snack",
          name: "Snack",
          quantity: 1,
          source: "fnb_menu",
        },
      ],
    });

    expect(lines[0]).toMatchObject({
      itemId: "snack",
      canEdit: false,
      streakCount: 0,
    });
  });
});

describe("toPaidBillItems", () => {
  it("splits paid quantity from gifted quantity of the same item", () => {
    const paid = toPaidBillItems(
      [{ itemId: "coca", description: "Coca", quantity: 3, price: 15000 }],
      buildInvoiceGiftLines([servedGift()]),
    );

    expect(paid).toEqual([
      { itemId: "coca", description: "Coca", quantity: 2, price: 15000 },
    ]);
  });

  it("hides a bill line that is entirely gifted", () => {
    const paid = toPaidBillItems(
      [{ itemId: "coca", description: "Coca", quantity: 1, price: 0 }],
      buildInvoiceGiftLines([servedGift()]),
    );

    expect(paid).toEqual([]);
  });

  it("matches by name when bill line has no itemId", () => {
    const paid = toPaidBillItems(
      [{ description: "Coca", quantity: 2, price: 15000 }],
      buildInvoiceGiftLines([servedGift()]),
    );

    expect(paid[0]?.quantity).toBe(1);
  });

  it("hides the bill line when itemId differs but the name is the same gift", () => {
    const paid = toPaidBillItems(
      [{ itemId: "menu-coca", description: "Coca", quantity: 1, price: 15000 }],
      buildInvoiceGiftLines([servedGift()]),
    );

    expect(paid).toEqual([]);
  });

  it("hides a longer bill description that still refers to the gift", () => {
    const paid = toPaidBillItems(
      [{ description: "Coca lon 330ml", quantity: 1, price: 0 }],
      buildInvoiceGiftLines([servedGift()]),
    );

    expect(paid).toEqual([]);
  });
});

describe("getServedGiftRemainingQuota", () => {
  it("sums remaining quota across served gifts", () => {
    expect(
      getServedGiftRemainingQuota([
        servedGift({ remainingQuantity: 1 }),
        servedGift({ streakCount: 5, remainingQuantity: 2 }),
      ]),
    ).toBe(3);
  });
});
