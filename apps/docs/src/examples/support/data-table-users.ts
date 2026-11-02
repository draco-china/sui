import type {
  DataTableRequestParams,
  DataTableResponse,
} from "@workspace/ui/components/data-table";

export type User = {
  id: string;
  name: string;
  email: string;
  status: "active" | "invited" | "suspended";
  role: "admin" | "editor" | "viewer";
  amount: number;
  usage: number;
  verified: boolean;
  createdAt: string;
  profile: { province: string; city: string };
};

const firstNames = [
  "Ada",
  "Bo",
  "Chen",
  "Dana",
  "Eli",
  "Fang",
  "Grace",
  "Hao",
  "Iris",
  "Jun",
  "Kai",
  "Lena",
  "Mei",
  "Noah",
  "Olga",
  "Ping",
  "Quinn",
  "Rui",
  "Sara",
  "Tao",
];
const lastNames = [
  "Li",
  "Wang",
  "Zhang",
  "Smith",
  "Garcia",
  "Kim",
  "Chen",
  "Liu",
];
const places = [
  { province: "Zhejiang", city: "Hangzhou" },
  { province: "Zhejiang", city: "Ningbo" },
  { province: "Guangdong", city: "Shenzhen" },
  { province: "Guangdong", city: "Guangzhou" },
  { province: "Sichuan", city: "Chengdu" },
];
const statuses: User["status"][] = ["active", "active", "invited", "suspended"];
const roles: User["role"][] = ["viewer", "editor", "viewer", "admin"];

/** Deterministic rows, so server and client render the same data. */
export function createUsers(count: number): User[] {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const start = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(random() * lastNames.length)];
    return {
      id: `U${String(index + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`,
      status: statuses[Math.floor(random() * statuses.length)],
      role: roles[Math.floor(random() * roles.length)],
      amount: Math.round(random() * 500_000) / 100,
      usage: Math.round(random() * 1000) / 10,
      verified: random() > 0.3,
      createdAt: new Date(start + Math.floor(random() * 500) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      profile: places[Math.floor(random() * places.length)],
    };
  });
}

export const users = createUsers(86);

export const provinces = [
  ...new Set(places.map((place) => place.province)),
].map((province) => ({ value: province, label: province }));

export function citiesOf(province: unknown) {
  return places
    .filter((place) => !province || place.province === province)
    .map((place) => ({ value: place.city, label: place.city }));
}

function compare(a: string | number, b: string | number) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function matches(user: User, key: string, value: unknown) {
  const text = (field: string) =>
    field.toLowerCase().includes(String(value).toLowerCase());
  if (key === "name") return text(user.name) || text(user.email);
  if (key === "status") return user.status === value;
  if (key === "role") return (value as string[]).includes(user.role);
  if (key === "createdFrom") return user.createdAt >= String(value);
  if (key === "createdTo") return user.createdAt <= String(value);
  if (key === "minAmount") return user.amount >= Number(value);
  if (key === "maxAmount") return user.amount <= Number(value);
  if (key === "province") return user.profile.province === value;
  if (key === "city") return user.profile.city === value;
  return true;
}

/**
 * Stands in for an API: it filters, sorts and pages after a short delay.
 * A real endpoint receives the same parameters.
 */
export async function fetchUsers(
  params: DataTableRequestParams,
): Promise<DataTableResponse<User>> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  params.signal.throwIfAborted();
  const keyword = params.keyword.toLowerCase();
  const rows = users.filter(
    (user) =>
      (!keyword ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.includes(keyword)) &&
      Object.entries(params.filters).every(
        ([key, values]) =>
          values.length === 0 ||
          values.includes(String(user[key as keyof User])),
      ) &&
      Object.entries(params.search).every(([key, value]) =>
        matches(user, key, value),
      ),
  );
  for (const { key, order } of [...params.sort].reverse()) {
    const field = key as "name" | "amount" | "createdAt" | "usage";
    const direction = order === "asc" ? 1 : -1;
    rows.sort((a, b) => compare(a[field], b[field]) * direction);
  }
  const start = (params.page - 1) * params.pageSize;
  return {
    data: rows.slice(start, start + params.pageSize),
    total: rows.length,
  };
}
