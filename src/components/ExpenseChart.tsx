import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, type CategoryExpense } from "@/data/financeData";

const COLORS = ['#a855f7', '#eab308', '#ef4444', '#3b82f6', '#f97316', '#64748b', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card dark:bg-[#121521] rounded-lg p-3 border border-border dark:border-indigo-900/30 shadow-md text-sm">
        <p className="font-medium text-foreground dark:text-white">{payload[0].name}</p>
        <p className="tabular-nums text-muted-foreground mt-1">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

interface ExpenseChartProps {
  data: CategoryExpense[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const pieData = data.map((d) => ({
    name: d.category,
    value: d.amount
  }));

  return (
    <motion.div
      className="rounded-xl p-6 shadow-sm border border-border dark:border-indigo-900/20 bg-card dark:bg-[#0F121E]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <h2 className="text-sm font-medium text-foreground dark:text-white mb-4">Gastos por Categoria</h2>
      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
          <p>Nenhuma despesa para exibir no período.</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-center h-64 gap-8">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 flex flex-col gap-3 overflow-y-auto pr-2 max-h-full">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                  />
                  <span className="text-muted-foreground dark:text-gray-300 font-medium">{d.name}</span>
                </div>
                <span className="text-foreground dark:text-white tabular-nums opacity-90">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
