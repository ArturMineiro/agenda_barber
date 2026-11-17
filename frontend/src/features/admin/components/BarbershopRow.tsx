import { Link } from "react-router-dom";
import { ChevronRight, User, Users } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import type { AdminBarbershop } from "@/types/api";
import { ShopStatusBadge } from "./status";

export function BarbershopRow({ shop }: { shop: AdminBarbershop }) {
  return (
    <Link
      to={`/admin/barbearias/${shop.id}`}
      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 font-semibold text-white" style={{ background: shop.primaryColor }}>
        {shop.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-medium">{shop.name}</p>
          <ShopStatusBadge status={shop.status} />
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-500">
          {shop.teamType === "SOLO" ? <User className="size-3" /> : <Users className="size-3" />}
          {shop.owner.name} · {shop.city ?? "—"}
        </p>
      </div>
      {shop.subscription && (
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{formatMoney(shop.subscription.priceCents)}/mês</p>
          <p className="text-xs text-zinc-500">{shop.subscription.plan.name}</p>
        </div>
      )}
      <ChevronRight className="size-4 text-zinc-300" />
    </Link>
  );
}
