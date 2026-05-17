import React, { useMemo, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  getMonthlySpendingRollupMetadata,
  getSankeyCategoryLabel,
  getSankeyMerchantLabel
} from './monthlySpendingFlowUtils';

interface SankeyTransaction {
  transaction_id?: number;
  transaction_type: string;
  amount: number;
  category_name?: string | null;
  payee_name?: string | null;
}

interface MonthlySpendingSankeyProps {
  transactions: SankeyTransaction[];
  onCategoryClick?: (categoryName: string) => void;
  onMerchantClick?: (merchantName: string) => void;
}

interface SankeyNode {
  id: string;
  label: string;
  total: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface SankeyLink {
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  value: number;
  leftY: number;
  rightY: number;
  thickness: number;
}

const LEFT_NODE_WIDTH = 168;
const RIGHT_NODE_WIDTH = 168;
const MIN_NODE_HEIGHT = 44;
const NODE_GAP = 14;
const SVG_WIDTH = 760;
const SVG_TOP_PADDING = 20;
const SVG_BOTTOM_PADDING = 20;

const BASE_COLORS = [
  '#0f766e',
  '#ea580c',
  '#2563eb',
  '#dc2626',
  '#7c3aed',
  '#ca8a04',
  '#0891b2',
  '#be123c'
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);

const truncateLabel = (label: string, maxLength: number) =>
  label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;

const layoutNodes = (
  items: Array<{ id: string; label: string; total: number; color: string }>,
  contentHeight: number,
  x: number,
  width: number
): SankeyNode[] => {
  if (items.length === 0) {
    return [];
  }

  const availableHeight = Math.max(
    contentHeight - NODE_GAP * Math.max(items.length - 1, 0),
    contentHeight * 0.6
  );
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const proportionalHeights = items.map((item) =>
    total > 0 ? (item.total / total) * availableHeight : availableHeight / items.length
  );
  const fixedHeights = proportionalHeights.map((height) => Math.max(height, MIN_NODE_HEIGHT));
  const rawTotalHeight =
    fixedHeights.reduce((sum, height) => sum + height, 0) +
    NODE_GAP * Math.max(items.length - 1, 0);
  const scale = rawTotalHeight > contentHeight ? contentHeight / rawTotalHeight : 1;

  let cursorY = 0;
  return items.map((item, index) => {
    const height = fixedHeights[index] * scale;
    const node: SankeyNode = {
      id: item.id,
      label: item.label,
      total: item.total,
      x,
      y: cursorY,
      width,
      height,
      color: item.color
    };

    cursorY += height + NODE_GAP * scale;
    return node;
  });
};

const MonthlySpendingSankey: React.FC<MonthlySpendingSankeyProps> = ({
  transactions,
  onCategoryClick,
  onMerchantClick
}) => {
  const theme = useTheme();
  const [hoveredSummary, setHoveredSummary] = useState<string | null>(null);

  const sankeyData = useMemo(() => {
    const expenses = transactions.filter((transaction) => transaction.transaction_type === 'expense');
    if (expenses.length === 0) {
      return {
        leftNodes: [] as SankeyNode[],
        rightNodes: [] as SankeyNode[],
        links: [] as Array<SankeyLink & { color: string }>,
        totalSpend: 0,
        svgHeight: 420
      };
    }

    const categoryTotals = new Map<string, number>();
    const merchantTotals = new Map<string, number>();
    const rawFlows = new Map<string, number>();

    expenses.forEach((transaction) => {
      const categoryName = transaction.category_name || 'Uncategorized';
      const merchantName = transaction.payee_name || 'No payee';
      const value = Math.abs(transaction.amount);

      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + value);
      merchantTotals.set(merchantName, (merchantTotals.get(merchantName) || 0) + value);
      rawFlows.set(
        `${categoryName}|||${merchantName}`,
        (rawFlows.get(`${categoryName}|||${merchantName}`) || 0) + value
      );
    });

    const metadata = getMonthlySpendingRollupMetadata(expenses);

    const normalizedFlows = new Map<string, number>();
    rawFlows.forEach((value, key) => {
      const [rawCategoryName, rawMerchantName] = key.split('|||');
      const categoryName = getSankeyCategoryLabel(rawCategoryName, metadata);
      const merchantName = getSankeyMerchantLabel(rawMerchantName, metadata);
      const normalizedKey = `${categoryName}|||${merchantName}`;
      normalizedFlows.set(normalizedKey, (normalizedFlows.get(normalizedKey) || 0) + value);
    });

    const normalizedCategoryTotals = new Map<string, number>();
    const normalizedMerchantTotals = new Map<string, number>();

    normalizedFlows.forEach((value, key) => {
      const [categoryName, merchantName] = key.split('|||');
      normalizedCategoryTotals.set(
        categoryName,
        (normalizedCategoryTotals.get(categoryName) || 0) + value
      );
      normalizedMerchantTotals.set(
        merchantName,
        (normalizedMerchantTotals.get(merchantName) || 0) + value
      );
    });

    const categoryEntries = Array.from(normalizedCategoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, total], index) => ({
        id: `category:${label}`,
        label,
        total,
        color: BASE_COLORS[index % BASE_COLORS.length]
      }));

    const merchantEntries = Array.from(normalizedMerchantTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, total]) => ({
        id: `merchant:${label}`,
        label,
        total,
        color: theme.palette.grey[300]
      }));

    const maxNodeCount = Math.max(categoryEntries.length, merchantEntries.length, 1);
    const contentHeight = Math.max(
      360,
      maxNodeCount * MIN_NODE_HEIGHT + Math.max(maxNodeCount - 1, 0) * NODE_GAP
    );
    const leftNodes = layoutNodes(categoryEntries, contentHeight, 0, LEFT_NODE_WIDTH);
    const rightNodes = layoutNodes(
      merchantEntries,
      contentHeight,
      SVG_WIDTH - RIGHT_NODE_WIDTH,
      RIGHT_NODE_WIDTH
    );

    const leftNodeMap = new Map(leftNodes.map((node) => [node.label, node]));
    const rightNodeMap = new Map(rightNodes.map((node) => [node.label, node]));
    const leftOffsets = new Map<string, number>();
    const rightOffsets = new Map<string, number>();
    const links: Array<SankeyLink & { color: string }> = [];

    normalizedFlows.forEach((value, key) => {
      const [categoryName, merchantName] = key.split('|||');
      const sourceNode = leftNodeMap.get(categoryName);
      const targetNode = rightNodeMap.get(merchantName);

      if (!sourceNode || !targetNode || value <= 0) {
        return;
      }

      const sourceOffset = leftOffsets.get(sourceNode.id) || 0;
      const targetOffset = rightOffsets.get(targetNode.id) || 0;
      const sourceThickness = (value / sourceNode.total) * sourceNode.height;
      const targetThickness = (value / targetNode.total) * targetNode.height;
      const thickness = Math.max(Math.min(sourceThickness, targetThickness), 4);

      links.push({
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        sourceLabel: categoryName,
        targetLabel: merchantName,
        value,
        leftY: sourceNode.y + sourceOffset + thickness / 2,
        rightY: targetNode.y + targetOffset + thickness / 2,
        thickness,
        color: sourceNode.color
      });

      leftOffsets.set(sourceNode.id, sourceOffset + sourceThickness);
      rightOffsets.set(targetNode.id, targetOffset + targetThickness);
    });

    return {
      leftNodes,
      rightNodes,
      links,
      totalSpend: expenses.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
      svgHeight: contentHeight + SVG_TOP_PADDING + SVG_BOTTOM_PADDING
    };
  }, [theme.palette.grey, transactions]);

  if (sankeyData.links.length === 0) {
    return (
      <Box
        sx={{
          height: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary'
        }}
      >
        <Typography variant="body2">
          Add categorized expense transactions with payees to see the monthly spending flow.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1,
          mb: 2
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {hoveredSummary || `Total tracked spend: ${formatCurrency(sankeyData.totalSpend)}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Click a category or merchant to open matching transactions.
        </Typography>
      </Box>

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${sankeyData.svgHeight}`}
          style={{ width: '100%', minHeight: sankeyData.svgHeight, display: 'block' }}
          role="img"
          aria-label="Monthly spending sankey diagram"
        >
          <defs>
            {sankeyData.leftNodes.map((node) => (
              <linearGradient
                key={`gradient:${node.id}`}
                id={`gradient-${node.id.replace(/[^a-z0-9]/gi, '-')}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={node.color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={node.color} stopOpacity="0.12" />
              </linearGradient>
            ))}
          </defs>

          <g transform={`translate(0, ${SVG_TOP_PADDING})`}>
            {sankeyData.links.map((link) => {
              const sourceNode = sankeyData.leftNodes.find((node) => node.id === link.sourceId)!;
              const targetNode = sankeyData.rightNodes.find((node) => node.id === link.targetId)!;
              const startX = sourceNode.x + sourceNode.width;
              const endX = targetNode.x;
              const controlX = (endX - startX) * 0.35;
              const gradientId = `gradient-${sourceNode.id.replace(/[^a-z0-9]/gi, '-')}`;

              return (
                <path
                  key={`${link.sourceId}-${link.targetId}`}
                  d={`M ${startX} ${link.leftY} C ${startX + controlX} ${link.leftY}, ${endX - controlX} ${link.rightY}, ${endX} ${link.rightY}`}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={link.thickness}
                  strokeLinecap="round"
                  opacity={hoveredSummary && !hoveredSummary.includes(link.sourceLabel) && !hoveredSummary.includes(link.targetLabel) ? 0.16 : 0.78}
                  onMouseEnter={() =>
                    setHoveredSummary(
                      `${link.sourceLabel} → ${link.targetLabel}: ${formatCurrency(link.value)}`
                    )
                  }
                  onMouseLeave={() => setHoveredSummary(null)}
                />
              );
            })}

            {sankeyData.leftNodes.map((node) => (
              <g
                key={node.id}
                onClick={() => onCategoryClick?.(node.label)}
                style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  fill={node.color}
                  opacity={0.88}
                />
                <text
                  x={node.x + 12}
                  y={node.y + node.height / 2 - 2}
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="600"
                  dominantBaseline="middle"
                >
                  {truncateLabel(node.label, 22)}
                </text>
                <text
                  x={node.x + 12}
                  y={node.y + node.height / 2 + 14}
                  fill="rgba(255,255,255,0.88)"
                  fontSize="11"
                  dominantBaseline="middle"
                >
                  {formatCurrency(node.total)}
                </text>
              </g>
            ))}

            {sankeyData.rightNodes.map((node) => (
              <g
                key={node.id}
                onClick={() => onMerchantClick?.(node.label)}
                style={{ cursor: onMerchantClick ? 'pointer' : 'default' }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={12}
                  fill={theme.palette.background.default}
                  stroke={theme.palette.divider}
                />
                <text
                  x={node.x + 12}
                  y={node.y + node.height / 2 - 2}
                  fill={theme.palette.text.primary}
                  fontSize="12"
                  fontWeight="600"
                  dominantBaseline="middle"
                >
                  {truncateLabel(node.label, 22)}
                </text>
                <text
                  x={node.x + 12}
                  y={node.y + node.height / 2 + 14}
                  fill={theme.palette.text.secondary}
                  fontSize="11"
                  dominantBaseline="middle"
                >
                  {formatCurrency(node.total)}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </Box>
    </Box>
  );
};

export default MonthlySpendingSankey;
