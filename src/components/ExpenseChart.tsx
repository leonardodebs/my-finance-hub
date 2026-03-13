import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency, type CategoryExpense } from "@/data/financeData";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card rounded-lg p-3 card-shadow text-sm">
        <p className="font-medium text-foreground">{payload[0].payload.category}</p>
        <p className="tabular-nums text-muted-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

interface ExpenseChartProps {
  data: CategoryExpense[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  return (
    <motion.div
      className="bg-card rounded-xl p-6 card-shadow"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <h2 className="text-sm font-medium text-muted-foreground mb-4">Despesas por Categoria</h2>
      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
          <p>Nenhuma despesa para exibir no período.</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="category"
                width={90}
                tick={{ fontSize: 13, fill: "hsl(240 3.8% 46.1%)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((_, index) => (
                  <Cell key={index} fill="hsl(221, 83%, 53%)" opacity={1 - index * 0.12} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
