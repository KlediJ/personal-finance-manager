import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Box } from '@mui/material';

interface CategoryData {
  name: string;
  total: number;
  count: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  onCategoryClick?: (name: string) => void;
  selectedCategoryName?: string | null;
}

// Generate colors for the chart (distinct but visually pleasing)
const generateColors = (count: number) => {
  const baseColors = [
    'rgba(255, 99, 132, {opacity})',   // Red
    'rgba(54, 162, 235, {opacity})',   // Blue
    'rgba(255, 206, 86, {opacity})',   // Yellow
    'rgba(75, 192, 192, {opacity})',   // Green
    'rgba(153, 102, 255, {opacity})',  // Purple
    'rgba(255, 159, 64, {opacity})',   // Orange
    'rgba(199, 199, 199, {opacity})',  // Gray
    'rgba(83, 102, 255, {opacity})',   // Indigo
    'rgba(255, 99, 255, {opacity})',   // Pink
    'rgba(99, 255, 132, {opacity})'    // Lime
  ];
  
  const backgroundColors = [];
  const borderColors = [];
  
  for (let i = 0; i < count; i++) {
    const colorIndex = i % baseColors.length;
    backgroundColors.push(baseColors[colorIndex].replace('{opacity}', '0.6'));
    borderColors.push(baseColors[colorIndex].replace('{opacity}', '1.0'));
  }
  
  return { backgroundColors, borderColors };
};

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  data,
  onCategoryClick
}) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Filter out data with zero or positive totals (we want expenses, which are negative)
    const filteredData = data.filter(item => item.total < 0);
      
    if (filteredData.length === 0) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data and colors
    const { backgroundColors, borderColors } = generateColors(filteredData.length);

    const totalPlugin = {
      id: 'category-total-plugin',
      afterDraw: (chart: Chart) => {
        const {
          ctx,
          chartArea: { left, right, top, bottom }
        } = chart;

        const dataset = chart.data.datasets[0];
        const values = (dataset.data || []) as number[];

        let visibleTotal = 0;
        values.forEach((value, index) => {
          if (chart.getDataVisibility(index)) {
            visibleTotal += value;
          }
        });

        if (!visibleTotal) {
          return;
        }

        const formattedTotal = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(visibleTotal);

        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        ctx.save();
        ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formattedTotal, centerX, centerY);
        ctx.restore();
      }
    };

    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: filteredData.map(item => item.name),
        datasets: [
          {
            data: filteredData.map(item => Math.abs(item.total)), // Use absolute values
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 15,
              font: {
                size: 10
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.raw !== null) {
                  label += new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(context.raw as number);
                  
                  // Add percentage
                  const total = (context.chart.data.datasets[0].data as number[])
                    .reduce((sum, val) => sum + (val as number), 0);
                  const percentage = Math.round(((context.raw as number) / total) * 100);
                  label += ` (${percentage}%)`;
                }
                return label;
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (!onCategoryClick) return;
          if (!elements || elements.length === 0) {
            return;
          }
          const element = elements[0];
          const index = element.index;
          const label = filteredData[index]?.name;
          if (label) {
            onCategoryClick(label);
          }
        }
      },
      plugins: [totalPlugin]
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef} />
    </Box>
  );
};

export default CategoryBreakdown;
