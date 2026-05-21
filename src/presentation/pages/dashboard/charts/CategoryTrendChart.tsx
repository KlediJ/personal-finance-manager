import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Box, Typography } from '@mui/material';

interface CategoryTrendPoint {
  monthKey: string;
  label: string;
  totals: Record<string, number>;
}

interface CategoryTrendChartProps {
  data: CategoryTrendPoint[];
  categories: string[];
}

const CATEGORY_COLORS = [
  { background: 'rgba(47, 128, 237, 0.65)', border: 'rgba(47, 128, 237, 1)' },
  { background: 'rgba(39, 174, 96, 0.65)', border: 'rgba(39, 174, 96, 1)' },
  { background: 'rgba(242, 153, 74, 0.7)', border: 'rgba(242, 153, 74, 1)' },
  { background: 'rgba(155, 81, 224, 0.65)', border: 'rgba(155, 81, 224, 1)' },
  { background: 'rgba(235, 87, 87, 0.65)', border: 'rgba(235, 87, 87, 1)' }
];

const CategoryTrendChart: React.FC<CategoryTrendChartProps> = ({ data, categories }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0 || categories.length === 0) {
      return;
    }

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) {
      return;
    }

    const datasets = categories.map((categoryName, index) => {
      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
      return {
        label: categoryName,
        data: data.map((point) => point.totals[categoryName] || 0),
        backgroundColor: color.background,
        borderColor: color.border,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      };
    });

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((point) => point.label),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0
                }).format(Number(value))
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = Number(context.parsed.y || 0);
                return `${label}: ${new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(value)}`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, categories]);

  if (data.length === 0 || categories.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Add categorized expense transactions to see category trends over time.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef} />
    </Box>
  );
};

export default CategoryTrendChart;
