const React = require('react');

const ResponsiveContainer = ({ children }) =>
  React.createElement('div', { 'data-testid': 'responsive-container' }, children);

const PieChart = ({ children, data }) =>
  React.createElement('div', { 'data-testid': 'pie-chart' }, children);

const BarChart = ({ children, data }) =>
  React.createElement('div', { 'data-testid': 'bar-chart' }, children);

const LineChart = ({ children, data }) =>
  React.createElement('div', { 'data-testid': 'line-chart' }, children);

const AreaChart = ({ children, data }) =>
  React.createElement('div', { 'data-testid': 'area-chart' }, children);

const Pie = ({ data, children }) =>
  React.createElement('div', { 'data-testid': 'pie' }, children);

const Bar = ({ dataKey, children }) =>
  React.createElement('div', { 'data-testid': 'bar' }, children);

const Line = ({ dataKey }) =>
  React.createElement('div', { 'data-testid': 'line' });

const Area = ({ dataKey }) =>
  React.createElement('div', { 'data-testid': 'area' });

const Cell = () =>
  React.createElement('div', { 'data-testid': 'cell' });

const XAxis = () =>
  React.createElement('div', { 'data-testid': 'x-axis' });

const YAxis = () =>
  React.createElement('div', { 'data-testid': 'y-axis' });

const CartesianGrid = () =>
  React.createElement('div', { 'data-testid': 'cartesian-grid' });

const Tooltip = () =>
  React.createElement('div', { 'data-testid': 'tooltip' });

const Legend = () =>
  React.createElement('div', { 'data-testid': 'legend' });

const Label = () =>
  React.createElement('div', { 'data-testid': 'label' });

module.exports = {
  ResponsiveContainer,
  PieChart,
  BarChart,
  LineChart,
  AreaChart,
  Pie,
  Bar,
  Line,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
};
