import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Attempt to fetch from 'todos' as described in generic Supabase quickstart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todos, error: todosError } = await (supabase as any).from("todos").select();
  
  // 2. Fetch from Farm2Door strongly-typed 'products' table
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price_per_unit, stock_quantity, is_available")
    .limit(5);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1B3B22] p-8 max-w-4xl mx-auto font-sans">
      <div className="mb-6 pb-4 border-b border-[#E5DBC7]">
        <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-[#1B3B22] hover:underline">
          &larr; Back to Farm2Door Home
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[#0D2E1C]">Supabase SSR Connection Test</h1>
        <p className="text-sm text-[#4F6A52] mt-1">
          Connected project: <code className="bg-[#EFECE6] px-2 py-0.5 rounded text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL}</code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E5DBC7] shadow-xs">
          <h2 className="text-lg font-semibold mb-3 text-[#0D2E1C]">Quickstart: Todos Table</h2>
          {todosError ? (
            <div className="p-3 bg-[#FFF5F5] border border-[#FEE2E2] rounded-lg text-xs text-[#991B1B]">
              <strong>Notice:</strong> {todosError.message} (table may not exist yet if only farm2door tables are created)
            </div>
          ) : todos && todos.length > 0 ? (
            <ul className="space-y-2">
              {todos.map((todo: { id: string | number; name?: string; title?: string }) => (
                <li key={todo.id} className="p-2 bg-[#F9F8F5] rounded text-sm border border-[#E5DBC7]">
                  {todo.name || todo.title || JSON.stringify(todo)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#4F6A52]">Query succeeded. 0 todos found.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E5DBC7] shadow-xs">
          <h2 className="text-lg font-semibold mb-3 text-[#0D2E1C]">Farm2Door: Products Table</h2>
          {productsError ? (
            <div className="p-3 bg-[#FFF5F5] border border-[#FEE2E2] rounded-lg text-xs text-[#991B1B]">
              <strong>Status:</strong> {productsError.message} (run migration script if tables are not yet deployed)
            </div>
          ) : products && products.length > 0 ? (
            <ul className="space-y-2">
              {products.map((prod) => (
                <li key={prod.id} className="p-2 bg-[#F9F8F5] rounded text-sm border border-[#E5DBC7] flex justify-between">
                  <span>{prod.name}</span>
                  <span className="font-semibold text-[#1B3B22]">₦{prod.price_per_unit?.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#4F6A52]">Query succeeded. Products table reachable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
