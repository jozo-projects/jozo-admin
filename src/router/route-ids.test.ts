import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { Role } from "@/constants/enum";
import type { User } from "@/@types/user";
import { routeTree } from "./route-tree";

const adminUser = {
  _id: "admin-1",
  phone_number: "0900000000",
  date_of_birth: "1990-01-01",
  role: Role.Admin,
  created_at: "2020-01-01T00:00:00.000Z",
  updated_at: "2020-01-01T00:00:00.000Z",
} satisfies User;

function createTestRouter(userId = "user-1") {
  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [`/users-management/${userId}/edit`],
    }),
    context: {
      queryClient: new QueryClient(),
      auth: {
        getCurrentUser: async () => adminUser,
        hasAnyRole: (user, roles) =>
          Boolean(user?.role && roles.includes(user.role)),
      },
    },
  });
}

describe("authenticated route ids", () => {
  it("matches users edit under /_authenticated, not the URL path", async () => {
    const userId = "user-1";
    const router = createTestRouter(userId);
    await router.load();

    const match = router.state.matches.find(
      (item) => item.routeId === "/_authenticated/users-management/$id/edit",
    );

    expect(match?.params).toMatchObject({ id: userId });
    expect(
      router.state.matches.some(
        (item) => item.routeId === "/users-management/$id/edit",
      ),
    ).toBe(false);
  });
});
