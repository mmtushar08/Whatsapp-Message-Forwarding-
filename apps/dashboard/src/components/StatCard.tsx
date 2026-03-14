interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'green' | 'red' | 'blue';
}

const colorMap = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    value: 'text-green-600',
    icon: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    value: 'text-red-600',
    icon: 'bg-red-100',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    value: 'text-blue-600',
    icon: 'bg-blue-100',
  },
};

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-6 shadow-sm flex items-center gap-4`}>
      <div className={`${c.icon} rounded-full p-3 text-2xl`}>{icon}</div>
      <div>
        <p className={`text-sm font-medium ${c.text}`}>{title}</p>
        <p className={`text-3xl font-bold ${c.value}`}>{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
